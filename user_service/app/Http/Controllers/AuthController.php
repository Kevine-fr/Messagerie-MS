<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{

    public function Register(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|unique:users,email',
                'password' => 'required|string|min:6|confirmed',
            ]);
    
            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }
    
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);
    
            $token = JWTAuth::fromUser($user);
    
            return response()->json([
                'message' => 'Utilisateur créé avec succès',
                'user' => $user,
                'token' => $token
            ], 201);
        } catch (\Throwable $th) {
            return response()->json([
                "message" => "Erreur lors de la création de l'utilisateur !",
                "errors" => $th->getMessage()
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

            return response()->json(['token' => $token]);
        } catch (\Throwable $th) {
            return response()->json([
                "message" => "Erreur lors de la connexion !",
                "errors" => $th->getMessage()
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
}