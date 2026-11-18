<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MediaController;

Route::get('/', function () {
    return "Service User is running... ✅";
});


Route::post('/upload', [AuthController::class, 'Upload']);

Route::prefix('user')->group(function () {
    Route::post('/send-mail', [UserController::class, 'SendMailUser']);
    Route::post('/validate-code', [UserController::class, 'ValidateCode']);
    Route::post('/login', [AuthController::class, 'Login']);
    Route::post('/logout', [AuthController::class, 'Logout']);
    Route::post('/register', [AuthController::class, 'Register']);
    // Sans authentification jusqu'au 18/11 : n'importe qui, sans jeton, pouvait
    // supprimer n'importe quel compte (DELETE /service/user/public/api/user/5).
    // Désormais : connecté, et seulement son propre compte (UserController).
    Route::middleware('jwt.auth')->delete('/{id}', [UserController::class, 'Destroy']);
    Route::middleware('jwt.auth')->get('/', [UserController::class, 'GetAllUsers']);            
    Route::middleware('jwt.auth')->get('/latest', [UserController::class, 'GetLastUsers']);     
    Route::middleware('jwt.auth')->get('/{id}', [UserController::class, 'GetUser']);             
});

Route::middleware('jwt.auth')->group(function () {
    Route::get('/me', [AuthController::class, 'Me']);
    Route::put('/user', [AuthController::class, 'Update']);
    Route::delete('/user', [AuthController::class, 'Delete']);

    // Upload générique de pièces jointes (photos, vidéos, documents).
    Route::post('/media', [MediaController::class, 'upload']);
});
