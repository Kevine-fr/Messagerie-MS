<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;


Route::get('/', function () {
    return var_dump(extension_loaded('rdkafka'));;
});

Route::get('/test', function () {
    return config('kafka.brokers');
});


Route::post('/register', [UserController::class, 'register']);
Route::post('/login', [UserController::class, 'login']);
Route::get('/users', [UserController::class, 'GetAllUsers']);

Route::delete('/user/{id}', [UserController::class, 'destroy']);
