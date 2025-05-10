<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;

Route::get('/', function () {
    return "Service User is running... ✅";
});

Route::get('/test', function () {
    return config('kafka.brokers');
});

Route::post('/user/login', [AuthController::class, 'Login']);
Route::post('/user/register', [AuthController::class, 'Register']);
Route::middleware('jwt.auth')->get('/me', [AuthController::class, 'Me']);

Route::delete('/user/{id}', [UserController::class, 'destroy']);
