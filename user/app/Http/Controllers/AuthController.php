<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use App\Services\KafkaProducerService;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Exceptions\JWTException;
use App\Contracts\MediaStorage;

class AuthController extends Controller
{

    public function Register(Request $request , KafkaProducerService $kafka, MediaStorage $storage)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|unique:users,email',
                'password' => 'required|string|min:6',
                'photo' => 'file|nullable|image|max:5120'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $url = null;
            $publicId = null;
            $photo = $request->file('photo');

            if($photo != null){
                $stored = $storage->store($photo, config('media.folder', 'Messagerie-mS'));
                $url = $stored['url'];
                $publicId = $stored['public_id'];
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'photo' => $url,
                'photo_public_id' => $publicId,
            ]);

            try {
            $kafka->send('user.created', [
                'user_id' => $user->id,
                'name' => $user->name,
                'photo' => $url,
            ]);
        } catch (\Exception $e) {
            Log::error("Kafka error: " . $e->getMessage());
        }
    
            $token = JWTAuth::fromUser($user);
    
            return response()->json([
                'message' => 'Utilisateur créé avec succès',
                'user' => $user,
                'token' => $token
            ], 201);
        } catch (\Throwable $e) {
            Log::error("Error: " . $e->getMessage());
            return response()->json([
                "message" => "Erreur lors de la création de l'utilisateur !",
                "errors" => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function Login(Request $request)
    {
        try {
            $credentials = $request->only('email', 'password');

            if (!$token = JWTAuth::attempt($credentials)) {
                return response()->json(['error' => 'Identifiants invalides'], 401);
            }

            $user = JWTAuth::user();

            return response()->json([
                'message' => 'Connexion réussie',
                'token' => $token,
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'photo' => $user->photo
                ]
            ]);
        } catch (\Throwable $th) {
            return response()->json([
                "message" => "Erreur lors de la connexion !",
                "errors" => $th->getMessage()
            ], 500);
        }
    }


    public function Logout(Request $request)
    {
        try {
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'message' => 'Erreur lors de la déconnexion !',
                    'errors' => 'Le token est requis.'
                ], 400);
            }

            $user = JWTAuth::setToken($token)->authenticate();
            JWTAuth::invalidate($token);

            return response()->json([
                'message' => 'Déconnexion réussie',
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'photo' => $user->photo
                ]
            ], 200);

        } catch (JWTException $e) {
            return response()->json([
                'message' => 'Erreur lors de la déconnexion !',
                'errors' => 'Token invalide ou déjà expiré.'
            ], 401);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur interne lors de la déconnexion !',
                'errors' => $e->getMessage()
            ], 500);
        }
    }


    public function Me()
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();
            return response()->json($user);
        } catch (\Throwable $th) {
            return response()->json([
                "message" => "Erreur lors de la récupération de l'utilisateur !",
                "errors" => $th->getMessage()
            ], 500);
        }
    }

     public function Upload(Request $request, MediaStorage $storage)
    {
        try {
            $request->validate([
                'file' => 'required|image|max:5120',
            ]);

            $file = $request->file('file');

            $stored = $storage->store($file, config('media.folder', 'Messagerie-mS'));
            $url = $stored['url'];

            return response()->json([
                'data' => $url
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                "message" => "Le fichier doit être une image valide.",
                "errors" => $e->errors()
            ], 422);
        } catch (\Throwable $th) {
            Log::error("Upload error: " . $th->getMessage());
            return response()->json([
                "message" => "Erreur lors de l'upload !",
                "errors" => config('app.debug') ? $th->getMessage() : null,
            ], 500);
        }
    }

    public function Update(Request $request , KafkaProducerService $kafka, MediaStorage $storage)
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

            $validator = Validator::make($request->all(), [
                'name' => 'string|max:255|nullable',
                'email' => 'string|email|unique:users,email,' . $user->id,
                'password' => 'string|min:6|nullable',
                'photo' => 'file|nullable|image|max:5120',
                'remove_photo' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            if ($request->filled('name')) $user->name = $request->name;
            if ($request->filled('email')) $user->email = $request->email;
            if ($request->filled('password')) $user->password = Hash::make($request->password);

            $removePhoto = filter_var($request->input('remove_photo', false), FILTER_VALIDATE_BOOLEAN);

            if ($request->hasFile('photo')) {
                // Remplacement : on supprime d'abord l'ancienne photo du stockage.
                $this->deleteStoredPhoto($storage, $user->photo_public_id);
                $stored = $storage->store($request->file('photo'), config('media.folder', 'Messagerie-mS'));
                $user->photo = $stored['url'];
                $user->photo_public_id = $stored['public_id'];
            } elseif ($removePhoto) {
                $this->deleteStoredPhoto($storage, $user->photo_public_id);
                $user->photo = null;
                $user->photo_public_id = null;
            }

            $user->save();

            try {
            $kafka->send('user.updated', [
                'user_id' => $user->id,
                'name' => $user->name,
                'photo' => $user->photo,
                ]);
            } catch (\Exception $e) {
                Log::error("Kafka error: " . $e->getMessage());
            }

            return response()->json([
                'message' => 'Compte mis à jour avec succès !',
                'user' => $user
            ], 200);

        } catch (\Tymon\JWTAuth\Exceptions\TokenInvalidException $e) {
            return response()->json(['message' => 'Token invalide.'], 401);
        } catch (\Tymon\JWTAuth\Exceptions\TokenExpiredException $e) {
            return response()->json(['message' => 'Token expiré.'], 401);
        } catch (\Throwable $th) {
            Log::error("Update error: " . $th->getMessage());
            return response()->json([
                "message" => "Erreur lors de la mise à jour de votre compte !",
                "errors" => config('app.debug') ? $th->getMessage() : null,
            ], 500);
        }
    }

    public function Delete(Request $request)
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

            $user->delete();

            return response()->json([
                'message' => 'Votre compte a été supprimé avec succès !'
            ], 200);

        } catch (\Tymon\JWTAuth\Exceptions\TokenInvalidException $e) {
            return response()->json(['message' => 'Token invalide.'], 401);
        } catch (\Tymon\JWTAuth\Exceptions\TokenExpiredException $e) {
            return response()->json(['message' => 'Token expiré.'], 401);
        } catch (\Throwable $th) {
            Log::error("Delete error: " . $th->getMessage());
            return response()->json([
                "message" => "Erreur lors de la suppression de votre compte !",
                "errors" => config('app.debug') ? $th->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Supprime du stockage la photo référencée par son public_id, sans casser
     * la requête si la suppression distante échoue (best effort).
     */
    private function deleteStoredPhoto(MediaStorage $storage, ?string $publicId): void
    {
        if (empty($publicId)) {
            return;
        }
        try {
            $storage->delete($publicId, 'image');
        } catch (\Throwable $th) {
            Log::warning("Suppression média ignorée ($publicId) : " . $th->getMessage());
        }
    }
}
