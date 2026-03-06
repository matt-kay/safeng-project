export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  apn: {
    token: {
      key: process.env.APN_KEY_PATH,
      keyId: process.env.APN_KEY_ID,
      teamId: process.env.APN_TEAM_ID,
    },
    production: process.env.NODE_ENV === 'production',
  },
  pubsub: {
    projectId: process.env.PUBSUB_PROJECT_ID || 'brisk-vtu',
    emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
    notificationsTopic:
      process.env.PUBSUB_NOTIFICATIONS_TOPIC || 'briskvtu-notifications',
    notificationsSubscription:
      process.env.PUBSUB_NOTIFICATIONS_SUBSCRIPTION ||
      'briskvtu-notifications-push-sub',
    pushEndpoint:
      process.env.PUBSUB_PUSH_ENDPOINT ||
      'http://localhost:3000/pubsub/notifications',
    verificationToken: process.env.PUBSUB_VERIFICATION_TOKEN,
  },
});
