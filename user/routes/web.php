<?php

use App\Services\MetricsService;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Metriques Prometheus
|--------------------------------------------------------------------------
| Lue par le Prometheus du VPS via le reseau Docker interne
| (messagerie-service-user:8000). L'endpoint n'est pas expose publiquement :
| la passerelle ne relaie que /service/user/*.
*/
Route::get('/metrics', function () {
    return response(
        MetricsService::export(),
        200,
        ['Content-Type' => 'text/plain; version=0.0.4']
    );
});

Route::get('/', function () {
    return view('welcome');
});
