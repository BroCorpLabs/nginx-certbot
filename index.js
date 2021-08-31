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

nginxConfigGenerator = (domain, ingressPoint, ingressPort) => {
    let confLines = [];
    confLines.push('server {');
    confLines.push('    listen 80;');
    confLines.push(`    server_name ${domain};`);
    confLines.push('    server_tokens off;');
    confLines.push('');
    confLines.push('    location /.well-known/acme-challenge/ {');
    confLines.push('        root /var/www/certbot;');
    confLines.push('    }');
    confLines.push('');
    confLines.push('    location / {');
    confLines.push('        return 301 https://$host$request_uri;');
    confLines.push('    }');
    confLines.push('}');
    confLines.push('');
    confLines.push('server {');
    confLines.push('    listen 443 ssl;');
    confLines.push(`    server_name ${domain};`);
    confLines.push('    server_tokens off;');
    confLines.push('');
    confLines.push(
        `    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;`,
    );
    confLines.push(
        `    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;`,
    );
    confLines.push('    include /etc/letsencrypt/options-ssl-nginx.conf;');
    confLines.push('    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;');
    confLines.push('');
    confLines.push('    location / {');
    confLines.push(`        proxy_pass  ${ingressPoint}:${ingressPort};`);
    confLines.push(
        '        proxy_set_header    Host                $http_host;',
    );
    confLines.push(
        '        proxy_set_header    X-Real-IP           $remote_addr;',
    );
    confLines.push(
        '        proxy_set_header    X-Forwarded-For     $proxy_add_x_forwarded_for;',
    );
    confLines.push('    }');
    confLines.push('}');
    return confLines.join('\n');
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
            `docker-compose run --rm --entrypoint "openssl req -x509 -nodes -newkey rsa:2048 -days 1 -keyout '${path}/privkey.pem' -out '${path}/fullchain.pem' -subj '/CN=localhost'" certbot`,
        );
    });
    runOne(`rm -f ./data/nginx/app.conf`);
    const mainConfig = '';
    corpConfig['domains'].forEach((eachDomain) => {
        mainConfig += nginxConfigGenerator(
            eachDomain['domainName'],
            corpConfig['resolveLocation'],
            eachDomain['resolveNodePortTo'],
        );
    });
    fs.writeFileSync('./data/nginx/app.conf', mainConfig);
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
