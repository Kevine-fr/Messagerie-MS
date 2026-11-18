<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\KafkaProducerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tymon\JWTAuth\Facades\JWTAuth;

/**
 * DELETE /api/user/{id} était public jusqu'au 18/11 : n'importe qui, sans
 * jeton, supprimait n'importe quel compte. Désormais : connecté, et seulement
 * son propre compte.
 */
class SuppressionCompteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Pas de Kafka (ni d'extension rdkafka) en test : le producteur est simulé.
        $this->mock(KafkaProducerService::class, function ($mock) {
            $mock->shouldReceive('send')->andReturnNull();
        });
    }

    private function entetes(User $user): array
    {
        return ['Authorization' => 'Bearer ' . JWTAuth::fromUser($user)];
    }

    public function test_sans_jeton_401_et_le_compte_reste(): void
    {
        $victime = User::factory()->create();

        $this->deleteJson("/api/user/{$victime->id}")->assertStatus(401);

        $this->assertDatabaseHas('users', ['id' => $victime->id]);
    }

    public function test_le_compte_d_un_autre_403(): void
    {
        $moi = User::factory()->create();
        $autre = User::factory()->create();

        $this->deleteJson("/api/user/{$autre->id}", [], $this->entetes($moi))->assertStatus(403);

        $this->assertDatabaseHas('users', ['id' => $autre->id]);
    }

    public function test_son_propre_compte_200(): void
    {
        $moi = User::factory()->create();

        $this->deleteJson("/api/user/{$moi->id}", [], $this->entetes($moi))->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $moi->id]);
    }
}
