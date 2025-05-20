<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\KafkaProducerService;
use App\Mail\ClientMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{

    public function GenerateCode(){
        try {    
            $code = random_int(1000, 9999);
            
            return $code;
        } catch (\Throwable $th) {
            return response()->json(['message' => 'Une erreur est survenue lors de la génération du code. Veuillez réessayer !', 'errors' => $th->getMessage()], 500);
        }
    }

    public function SendMailUser(Request $request)
    {
        try {
            $data = $request->validate([
                'email' => 'required|email'
            ]);
    
            $email = $data['email'];

            $userExist = User::where('email', $email)->exists();

            if ($userExist) {
                return response()->json(["message" => "Cet email est déjà lié à un compte !"]);
            }

            $code = $this->GenerateCode();
            $data['code'] = $code;
            $email = $data['email'];

            $subject = "Confirmation d'inscription via code de vérification";

            Mail::to($email)->send(new ClientMail($data, $subject));
    
            Cache::put("verification_code_$code", true, now()->addSeconds(120));

            return response()->json(['message' => 'E-mail envoyé avec succès !', 'data' => $code] , 200);

        } catch (\Exception $e) {
            return response()->json(["message" => "Échec de l'envoi. Veuillez vérifier votre connexion !", "errors" => $e->getMessage()], 500);
        }
    }
    
    public function ValidateCode(Request $request)
    {
        try {
            $data = $request->validate([
                'code' => 'required|integer'
            ]);
    
            $code = $data['code'];

            if (Cache::has("verification_code_$code")) {
                return response()->json(['message' => 'Code correcte !'], 200);
            }
            return response()->json(['message' => 'Code incorrecte ou expiré !'], 400);
        } catch (\Throwable $th) {
            return response()->json(['message' => 'Erreur lors de la vérification du code !', 'errors' => $th->getMessage()], 500);
        }
    }

    public function Destroy($id, KafkaProducerService $kafka)
    {
        Log::info("Suppression utilisateur $id");

        $user = User::findOrFail($id);
        $user->delete();

        try {
            $kafka->send('user.deleted', [
                'user_id' => $user->id,
            ]);
        } catch (\Exception $e) {
            Log::error("Kafka error: " . $e->getMessage());
        }

        return response()->json(['message' => 'Utilisateur supprimé avec succès !']);
    }

    public function GetAllUsers()
    {
        try {
            $users = User::all();

            return response()->json([
                'success' => true,
                'message' => 'Liste des utilisateurs récupérée avec succès.',
                'data' => $users
            ], 200);
        } catch (\Exception $e) {
            Log::error("Erreur lors de la récupération des utilisateurs : " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des utilisateurs.',
                'errors' => $e->getMessage()
            ], 500);
        }
    }

    public function GetLastUsers()
    {
        try {
            $users = User::latest()->take(15)->get();

            return response()->json([
                'success' => true,
                'message' => 'Derniers utilisateurs récupérés avec succès.',
                'data' => $users
            ], 200);
        } catch (\Exception $e) {
            Log::error("Erreur lors de la récupération des derniers utilisateurs : " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des derniers utilisateurs.',
                'errors' => $e->getMessage()
            ], 500);
        }
    }

    public function GetUser($id)
    {
        try {
            $user = User::find($id);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur introuvable.',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Utilisateur récupéré avec succès.',
                'data' => $user
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur serveur lors de la récupération de l\'utilisateur.',
                'errors' => $e->getMessage()
            ], 500);
        }
    }

    public function Test()
    {
        $users = User::all();
        Log::info("Consommation du message sended : " . $users);

        return response()->json(['message' => 'Test']);
    }
}
