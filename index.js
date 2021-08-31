const express = require('express');
var Docker = require('dockerode');
const { exec, execSync } = require('child_process');
const { performance } = require('perf_hooks');
const fetch = require('node-fetch');
tar = require('tar-fs');
var docker = new Docker({ socketPath: '/var/run/docker.sock' });
const app = express();
const fs = require('fs');
const port = 8787;
const rsaKeySize = 4096;
const dataPath = './data/certbot';
const staging = 0;

const runOne = (line) => {
    execSync(line, { stdio: 'inherit' });
};

app.post('/config', (req, res) => {
    res.send('Configuring!');
    const corpConfig = JSON.parse(fs.readFileSync('./corp-config.json'));
    console.log(JSON.stringify(corpConfig));

    // TODO: drop only if they are not already configured
    console.log('Dropping existing certs');
    runOne(`rm -rf ${dataPath}`);
    runOne(`mkdir -p ${dataPath}/conf`);

    runOne(
        `curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "${data_path}/conf/options-ssl-nginx.conf"`,
    );
    runOne(
        `curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "${data_path}/conf/ssl-dhparams.pem"`,
    );
    corpConfig['domains'].forEach((eachDomain) => {
        console.log(`Creating dummy cert for ${eachDomain['domainName']}`);
        const path = `/etc/letsencrypt/live/${eachDomain['domainName']}`;
        runOne(`mkdir -p ${dataPath}/conf/live/${eachDomain['domainName']}`);
        runOne(
            `docker-compose run --rm --entrypoint openssl req -x509 -nodes -newkey rsa:2048 -days 1 -keyout '${path}/privkey.pem' -out '${path}/fullchain.pem' -subj '/CN=localhost'" certbot`,
        );
    });
    runOne(`docker-compose up --force-recreate -d nginx`);
    corpConfig['domains'].forEach((eachDomain) => {
        console.log(`Dropping dummy cert for ${eachDomain['domainName']}`);
        runOne(
            `docker-compose run --rm --entrypoint "rm -Rf /etc/letsencrypt/live/${eachDomain['domainName']} && rm -Rf /etc/letsencrypt/live/${eachDomain['domainName']} && rm -Rf /etc/letsencrypt/renewal/${eachDomain['domainName']}.conf" certbot`,
        );
    });
    corpConfig['domains'].forEach((eachDomain) => {
        let domainArgs = '';
        domainArgs = domainArgs + `-d ${eachDomain['domainName']}`;
        let emailArgs = `--email ${corpConfig['email']}`;
        let stagingArgs = '';
        if (staging === 0) {
            stagingArgs = '';
        } else {
            stagingArgs = '--staging';
        }
        runOne(
            `docker-compose run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot ${stagingArgs} ${emailArgs} ${domainArgs} --rsa-key-size ${rsaKeySize} --agree-tos --force-renewal" certbot`,
        );
    });
    runOne('docker-compose exec nginx nginx -s reload');
});

app.listen(port, () => {
    console.log(`BroCorp Configurator listening at http://0.0.0.0:${port}`);
    fetch('http://localhost:8787/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
});
