/**
 * Données mockées pour l'application BDE
 * Ces données seront remplacées par des appels API réels plus tard
 */

// Événements
export const mockEvents = [
  {
    id: '1',
    title: 'Soirée d\'intégration',
    date: '2024-10-15',
    time: '20:00',
    location: 'Campus Principal - Salle Polyvalente',
    description: 'Venez rencontrer les nouveaux étudiants et passer une soirée inoubliable ! Au programme : musique, jeux, buffet et animations.',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
    registered: false,
    maxParticipants: 200,
    currentParticipants: 145,
  },
  {
    id: '2',
    title: 'Tournoi de foot',
    date: '2024-10-20',
    time: '14:00',
    location: 'Terrain de sport',
    description: 'Tournoi de football inter-promotions. Inscription par équipe de 7 joueurs.',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
    registered: false,
    maxParticipants: 56,
    currentParticipants: 42,
  },
  {
    id: '3',
    title: 'Conférence : Entrepreneuriat',
    date: '2024-10-25',
    time: '18:00',
    location: 'Amphithéâtre A',
    description: 'Conférence avec des entrepreneurs locaux sur le thème de la création d\'entreprise.',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    registered: true,
    maxParticipants: 150,
    currentParticipants: 98,
  },
  {
    id: '4',
    title: 'Atelier cuisine',
    date: '2024-11-01',
    time: '16:00',
    location: 'Cuisine pédagogique',
    description: 'Apprenez à cuisiner des plats du monde avec nos chefs partenaires.',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
    registered: false,
    maxParticipants: 20,
    currentParticipants: 12,
  },
];

// Sondages
export const mockPolls = [
  {
    id: '1',
    question: 'Quel thème pour la prochaine soirée ?',
    options: [
      { id: 'a', text: 'Soirée années 80', votes: 45 },
      { id: 'b', text: 'Soirée tropicale', votes: 32 },
      { id: 'c', text: 'Soirée pyjama', votes: 28 },
      { id: 'd', text: 'Soirée casino', votes: 19 },
    ],
    userVote: null, // null si pas voté, sinon l'id de l'option
    endDate: '2024-10-18',
    totalVotes: 124,
  },
  {
    id: '2',
    question: 'Quel jour préférez-vous pour les activités sportives ?',
    options: [
      { id: 'a', text: 'Lundi', votes: 12 },
      { id: 'b', text: 'Mercredi', votes: 35 },
      { id: 'c', text: 'Vendredi', votes: 28 },
      { id: 'd', text: 'Samedi', votes: 15 },
    ],
    userVote: 'b',
    endDate: '2024-10-22',
    totalVotes: 90,
  },
  {
    id: '3',
    question: 'Quel type de sortie souhaitez-vous organiser ?',
    options: [
      { id: 'a', text: 'Escape Game', votes: 42 },
      { id: 'b', text: 'Laser Game', votes: 38 },
      { id: 'c', text: 'Karting', votes: 25 },
      { id: 'd', text: 'Bowling', votes: 19 },
    ],
    userVote: null,
    endDate: '2024-10-30',
    totalVotes: 124,
  },
];

// Actualités
export const mockNews = [
  {
    id: '1',
    title: 'Nouvelle équipe BDE élue !',
    content: 'Félicitations à la nouvelle équipe du BDE qui a été élue hier soir. Ils ont de nombreux projets pour cette année !',
    date: '2024-10-10',
    author: 'BDE',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800',
    category: 'Actualité',
  },
  {
    id: '2',
    title: 'Inscriptions ouvertes pour le tournoi de foot',
    content: 'Les inscriptions pour le tournoi de football inter-promotions sont maintenant ouvertes. Inscrivez-vous vite, les places sont limitées !',
    date: '2024-10-12',
    author: 'BDE',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
    category: 'Sport',
  },
  {
    id: '3',
    title: 'Nouveau partenariat avec la cafétéria',
    content: 'Le BDE a signé un partenariat avec la cafétéria. Désormais, bénéficiez de 10% de réduction sur tous vos achats avec votre carte étudiante !',
    date: '2024-10-08',
    author: 'BDE',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    category: 'Partenariat',
  },
  {
    id: '4',
    title: 'Rappel : Soirée d\'intégration le 15 octobre',
    content: 'N\'oubliez pas la soirée d\'intégration qui aura lieu le 15 octobre à 20h. Venez nombreux !',
    date: '2024-10-13',
    author: 'BDE',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
    category: 'Événement',
  },
];

// Clubs & Associations
export const mockClubs = [
  {
    id: '1',
    name: 'Club Photo',
    description: 'Passionnés de photographie ? Rejoignez-nous pour des sorties photo, des ateliers et des expositions.',
    contact: 'photo@bde.fr',
    president: 'Marie Dupont',
    members: 45,
    image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800',
    category: 'Art',
  },
  {
    id: '2',
    name: 'Club Robotique',
    description: 'Concevez et construisez des robots pour participer à des compétitions. Ouvert à tous les niveaux !',
    contact: 'robotique@bde.fr',
    president: 'Thomas Martin',
    members: 32,
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
    category: 'Technique',
  },
  {
    id: '3',
    name: 'Club Théâtre',
    description: 'Montez sur scène et participez à nos représentations. Répétitions tous les mercredis soir.',
    contact: 'theatre@bde.fr',
    president: 'Sophie Bernard',
    members: 28,
    image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800',
    category: 'Art',
  },
  {
    id: '4',
    name: 'Club Environnement',
    description: 'Agissez pour l\'environnement ! Organisons des actions écologiques et des événements de sensibilisation.',
    contact: 'environnement@bde.fr',
    president: 'Lucas Petit',
    members: 67,
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
    category: 'Engagement',
  },
  {
    id: '5',
    name: 'Club Musique',
    description: 'Musiciens de tous niveaux, venez partager votre passion ! Répétitions et concerts réguliers.',
    contact: 'musique@bde.fr',
    president: 'Emma Rousseau',
    members: 52,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    category: 'Art',
  },
];

// Galerie photos
export const mockGallery = [
  {
    id: '1',
    title: 'Soirée de fin d\'année 2023',
    date: '2023-06-15',
    images: [
      'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
    ],
  },
  {
    id: '2',
    title: 'Tournoi de foot 2023',
    date: '2023-05-20',
    images: [
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    ],
  },
  {
    id: '3',
    title: 'Atelier cuisine',
    date: '2023-04-10',
    images: [
      'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800',
    ],
  },
];
