<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\KafkaProducerService;

class UserController extends Controller
{
    public function destroy($id, KafkaProducerService $kafka)
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
        $users = User::all();
        return response()->json($users);
    }
}
