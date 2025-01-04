const sqlite3 = require('sqlite3').verbose();
const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

// Créer la base de données SQLite et la table des événements
let db = new sqlite3.Database('./events.db', (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err.message);
  } else {
    console.log('Connecté à la base de données SQLite.');
    db.run('CREATE TABLE IF NOT EXISTS events (name TEXT, date TEXT, participants TEXT)', (err) => {
      if (err) {
        console.error('Erreur de création de la table:', err.message);
      }
    });
  }
});

// Création de l'instance du bot Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Fonction pour enregistrer un événement dans la base de données
function createEvent(name, date) {
  db.run('INSERT INTO events (name, date, participants) VALUES (?, ?, ?)', [name, date, ''], (err) => {
    if (err) {
      console.error('Erreur d\'ajout de l\'événement:', err.message);
    }
  });
}

// Fonction pour rejoindre un événement
function joinEvent(eventName, username) {
  db.get('SELECT participants FROM events WHERE name = ?', [eventName], (err, row) => {
    if (err) {
      console.error('Erreur lors de la récupération des participants:', err.message);
      return;
    }
    if (row) {
      let participants = row.participants.split(',');
      if (participants.includes(username)) {
        console.log(`${username} est déjà inscrit à l'événement ${eventName}`);
      } else {
        participants.push(username);
        db.run('UPDATE events SET participants = ? WHERE name = ?', [participants.join(','), eventName], (err) => {
          if (err) {
            console.error('Erreur de mise à jour des participants:', err.message);
          } else {
            console.log(`${username} s'est inscrit à l'événement ${eventName}`);
          }
        });
      }
    } else {
      console.log(`L'événement ${eventName} n'existe pas.`);
    }
  });
}

// Commande pour afficher l'aide
client.on('messageCreate', (message) => {
  if (!message.content.startsWith('!')) return; // Vérifie si la commande commence par "!"
  
  const args = message.content.slice(1).split('"').map(arg => arg.trim()).filter(Boolean);

  // Commande pour afficher l'aide
  if (args[0] === 'eventhelp') {
    const helpMessage = `
      **Voici les commandes disponibles pour EventBot :**
      
      1. **!create_event "nom de l'événement" "date"**  
         Crée un événement avec un nom et une date spécifiée. Exemple : \`!create_event "Anniversaire" "AAAA-MM-JJ"\`
      
      2. **!join_event "nom de l'événement"**  
         Permet de s'inscrire à un événement existant. Exemple : \`!join_event "Anniversaire"\`
      
      3. **!upcoming_events**  
         Affiche la liste des événements à venir.
      
      4. **!eventhelp**  
         Affiche ce message d'aide avec toutes les commandes disponibles.
      
      **Note :** Les événements doivent être enregistrés avec le format "nom" et "date". La date doit être au format \`YYYY-MM-DD\`.
    `;
    message.reply(helpMessage);
  }

  // Commande pour créer un événement
  if (args[0] === 'create_event' && args.length === 3) {
    const eventName = args[1];
    const eventDate = args[2];
    createEvent(eventName, eventDate);
    message.reply(`L'événement "${eventName}" a été créé pour le ${eventDate}`);
  }

  // Commande pour rejoindre un événement
  else if (args[0] === 'join_event' && args.length === 2) {
    const eventName = args[1];
    joinEvent(eventName, message.author.username);
    message.reply(`Tu t'es inscrit à l'événement "${eventName}"`);
  }

  // Commande pour afficher les événements à venir
  else if (args[0] === 'upcoming_events') {
    db.all('SELECT name, date FROM events', [], (err, rows) => {
      if (err) {
        console.error('Erreur lors de la récupération des événements:', err.message);
        return;
      }
      if (rows.length === 0) {
        message.reply('Aucun événement à venir.');
      } else {
        let eventList = rows.map(row => `${row.name} - Date: ${row.date}`).join('\n');
        message.reply(eventList);
      }
    });
  }
});

// Lorsque le bot est prêt
client.once('ready', () => {
  console.log('EventBot est prêt!');
});

// Connecte le bot à Discord avec le token
client.login(token);
