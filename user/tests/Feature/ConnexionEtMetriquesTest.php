<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ConnexionEtMetriquesTest extends TestCase
{
    use RefreshDatabase;

    public function test_connexion_reussie_rend_un_jeton(): void
    {
        User::factory()->create(['email' => 'camille@exemple.fr', 'password' => Hash::make('secret123')]);

        $this->postJson('/api/user/login', ['email' => 'camille@exemple.fr', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonStructure(['token', 'data' => ['id', 'email']]);
    }

    public function test_mauvais_mot_de_passe_401(): void
    {
        User::factory()->create(['email' => 'camille@exemple.fr', 'password' => Hash::make('secret123')]);

        $this->postJson('/api/user/login', ['email' => 'camille@exemple.fr', 'password' => 'faux'])
            ->assertStatus(401);
    }

    public function test_route_privee_sans_jeton_401(): void
    {
        $this->getJson('/api/me')->assertStatus(401);
    }

    public function test_metriques_prometheus(): void
    {
        $this->postJson('/api/user/login', ['email' => 'x@exemple.fr', 'password' => 'y']);

        $this->get('/metrics')
            ->assertOk()
            ->assertSee('http_requests_total', false)
            ->assertSee('http_request_duration_seconds', false);
    }
}
