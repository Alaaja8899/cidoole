const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const { writeFileSync } = require('fs');

(async () => {
  const { state, saveState } = useSingleFileAuthState('./auth_info.json');
  const sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveState);

  // Wait until connection is established
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('Successfully connected to WhatsApp!');

      // Fetch all chats
      const chats = await sock.chats.all();

      // Filter groups from chats
      const groups = chats.filter(chat => chat.id.endsWith('@g.us'));

      // Display groups and save to JSON
      const groupDetails = groups.map(group => ({
        id: group.id,
        name: group.subject
      }));

      console.log('Groups:', groupDetails);
      writeFileSync('./groups.json', JSON.stringify(groupDetails, null, 2));
      console.log('Group list saved to groups.json!');
    }

    if (connection === 'close') {
      console.error('Connection closed. Reason:', lastDisconnect.error);
    }
  });
})();
