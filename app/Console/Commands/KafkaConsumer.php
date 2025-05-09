<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use RdKafka\Consumer;
use RdKafka\ConsumerTopic;
use App\Models\User;  // Assurez-vous d'inclure le modèle User
use Faker\Factory as Faker;

class KafkaConsumer extends Command
{
    protected $signature = 'kafka:consume {topic}';
    protected $description = 'Consomme des messages depuis Kafka et crée un utilisateur aléatoire';

    public function handle()
    {
        $topic = $this->argument('topic');
        
        // Créer une instance du consommateur Kafka
        $consumer = new Consumer();
        $consumer->addBrokers(config('kafka.brokers')); // Le broker Kafka

        // Créer un consommateur pour le topic spécifié
        $topicInstance = $consumer->newTopic($topic);

        // Commencer à consommer à partir du début si aucun message n'a été consommé
        $topicInstance->consumeStart(0, RD_KAFKA_OFFSET_BEGINNING); // Consommer depuis le début du topic

        // Créer une instance de Faker pour générer des données aléatoires
        $faker = Faker::create();

        // Consommer les messages indéfiniment (ou jusqu'à une certaine condition)
        while (true) {
            // Consommer un message avec un délai de 1000ms (1 seconde)
            $message = $topicInstance->consume(0, 1000); 

            // Vérifier si le message est null
            if ($message === null) {
                echo "Aucun message à consommer. En attente...\n";
                sleep(1); // Attente de 1 seconde avant de réessayer
                continue; // Si aucun message, continuer
            }

            // Vérifier s'il y a une erreur dans le message
            if ($message->err) {
                echo "Erreur: {$message->errstr()}\n";
                break; // Arrêter la consommation si une erreur est détectée
            }

            // Affichage du message reçu
            echo "Message reçu: " . $message->payload . "\n";

            // Créer un utilisateur aléatoire dans la base de données
            $this->createRandomUser($faker);

            // Si tu veux éviter que la boucle se répète trop rapidement,
            // tu peux ajouter une petite pause pour diminuer la charge du processeur
            sleep(1); // Attente de 1 seconde avant de récupérer le prochain message
        }
    }

    // Méthode pour créer un utilisateur aléatoire dans la base de données
    private function createRandomUser($faker)
    {
        // Créer un utilisateur aléatoire avec Faker
        $user = User::create([
            'name' => $faker->name,
            'email' => $faker->unique()->safeEmail,
            'password' => bcrypt('password'), // Tu peux ajuster ce mot de passe
        ]);

        echo "Utilisateur créé: {$user->name}, Email: {$user->email}\n";
    }
}
