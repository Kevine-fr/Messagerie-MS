<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use RdKafka\Consumer;
use RdKafka\Message;

class KafkaConsumer extends Command
{
    protected $signature = 'kafka:consume {topics=user.deleted,message.sended}';
    protected $description = 'Consomme les messages depuis Kafka pour plusieurs topics';

    // Variable pour le compteur
    private $messageCount = 0;

    public function handle()
    {
        // Récupérer les topics depuis l'argument
        $topics = explode(',', $this->argument('topics')); // Sépare les topics par des virgules

        // Créer une instance du consommateur Kafka
        $consumer = new Consumer();
        $consumer->addBrokers(config('kafka.brokers')); // Assure-toi de configurer les brokers Kafka dans le fichier .env

        foreach ($topics as $topic) {
            // Créer un consommateur pour chaque topic spécifié
            $topicInstance = $consumer->newTopic($topic);

            // Commencer à consommer à partir du début si aucun message n'a été consommé
            $topicInstance->consumeStart(0, RD_KAFKA_OFFSET_BEGINNING);
            echo "Consommation des messages du topic: {$topic}\n";

            // Consommer les messages indéfiniment
            while (true) {
                // Consommer un message avec un délai de 1000ms (1 seconde)
                $message = $topicInstance->consume(0, 1000);

                // Vérifier si le message est null
                if ($message === null) {
                    echo "En attente sur le topic {$topic}...\n";
                    sleep(1);
                    continue; // Si aucun message, continuer
                }

                // Vérifier s'il y a une erreur dans le message
                if ($message->err) {
                    echo "Erreur sur le topic {$topic}: {$message->errstr()}\n";
                    break; // Arrêter la consommation si une erreur est détectée
                }

                // Affichage du message reçu
                echo "Message reçu du topic {$topic}: " . $message->payload . "\n";

                // Incrémenter le compteur pour chaque message reçu
                $this->incrementMessageCount();

                // Afficher le compteur actuel
                echo "Messages consommés: {$this->messageCount}\n";

                // Si tu veux éviter que la boucle se répète trop rapidement,
                // tu peux ajouter une petite pause pour diminuer la charge du processeur
                sleep(1);
            }
        }
    }

    // Méthode pour incrémenter le compteur
    private function incrementMessageCount()
    {
        $this->messageCount++;
    }
}
