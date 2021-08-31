# BroCorp Configurator

Used to connect an Application on a k8s cluster exposed as a NodePort to a centralized traffic origination point

-   Supports multiple domains
-   Renews multiple domains

## Instructions

Create a `corp-config.json` with the following contents

```
{
    "domains": [
        {
            "domainName": "dragdrop.website",
            "resolveNodePortTo": "31001"
        }
        // multiple domains go here
    ],
    "resolveLocation": "http://35.232.242.26",
    "email": "lokesh.poovaragan@gmail.com"
}
```

Where

-   `domainName` is the domain you want to link
-   `resolveNodePortTo` is the NodePort exposed by the Service associated with your Application
-   `resolveLocation` is one of the External IPs obtained by running `kubectl get nodes -o wide` on your cluster
-   `email` is your email that LetsEncrypt uses to let you know about pending renews on your domains

## Originally forked from https://github.com/wmnnd/nginx-certbot

## Original README

## Boilerplate for nginx with Let’s Encrypt on docker-compose

> This repository is accompanied by a [step-by-step guide on how to
> set up nginx and Let’s Encrypt with Docker](https://medium.com/@pentacent/nginx-and-lets-encrypt-with-docker-in-less-than-5-minutes-b4b8a60d3a71).

`init-letsencrypt.sh` fetches and ensures the renewal of a Let’s
Encrypt certificate for one or multiple domains in a docker-compose
setup with nginx.
This is useful when you need to set up nginx as a reverse proxy for an
application.

## Installation

1. [Install docker-compose](https://docs.docker.com/compose/install/#install-compose).

2. Clone this repository: `git clone https://github.com/wmnnd/nginx-certbot.git .`

3. Modify configuration:

-   Add domains and email addresses to init-letsencrypt.sh
-   Replace all occurrences of example.org with primary domain (the first one you added to init-letsencrypt.sh) in data/nginx/app.conf

4.  Run the init script:

        ./init-letsencrypt.sh

5.  Run the server:

        docker-compose up

## Got questions?

Feel free to post questions in the comment section of the [accompanying guide](https://medium.com/@pentacent/nginx-and-lets-encrypt-with-docker-in-less-than-5-minutes-b4b8a60d3a71)

## License

All code in this repository is licensed under the terms of the `MIT License`. For further information please refer to the `LICENSE` file.
