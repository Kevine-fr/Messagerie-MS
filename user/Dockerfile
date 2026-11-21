# Version figée, jamais « 8.2-fpm » : une étiquette flottante ne dit pas
# quelle version tourne, et une image bâtie avant le 19/11/2026 garde les
# failles corrigées par PHP 8.2.36 (injection d'objets par la session
# CVE-2026-115560, use-after-free du fuseau horaire CVE-2026-129496…).
# tests/Unit/ImageDockerTest.php refuse une version antérieure.
FROM php:8.2.36-fpm

RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libpq-dev \
    git \
    unzip \
    libxml2-dev \
    curl \
    gnupg2 \
    lsb-release \
    librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo pdo_pgsql pgsql

ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN chmod +x /usr/local/bin/install-php-extensions \
    && install-php-extensions rdkafka

WORKDIR /var/www

COPY user/ .

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

EXPOSE 8000

CMD php artisan migrate --force && \
    php artisan serve --host=0.0.0.0 --port=8000