const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const port = 3000;
const piHostname = 'pi';
const piUser = 'pi';
const sshCmd = `ssh ${piUser}@${piHostname}`;

// { switch} at the end of the command. Maybe '--use-remote-sudo switch'
const nixRemoteBuildCmd = `nixos-rebuild --target-host ${piUser}@${piHostname}`;
// look at link for more info: https://docs.nixbuild.net/remote-builds/
app.use(bodyParser.json());

app.post('/rebuild', (req, res) => {
    const values = req.body.values;

    if (!Array.isArray(values)) {
        return res.status(400).send('Invalid input');
    }

    const command = `${sshCommand} 'nix-rebuild ${values.join(' ')}'`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${error.message}`);
            return res.status(500).send(`Error: ${error.message}`);
        }

        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).send(`stderr: ${stderr}`);
        }

        console.log(`stdout: ${stdout}`);
        res.send(`Command executed successfully: ${stdout}`);
    });
});

app.listen(port, () => {
    console.log(`Rebuilder app listening at http://localhost:${port}`);
});