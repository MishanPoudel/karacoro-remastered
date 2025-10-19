import { Users, Music, Crown, Volume2, Zap, Shield, Globe } from 'lucide-react';

export const features = [
  {
    icon: Users,
    title: 'Real-time Sync',
    description:
      'Everyone watches and sings along in perfect sync, no matter where they are in the world.',
    color: 'text-red-400',
  },
  {
    icon: Music,
    title: 'YouTube Integration',
    description:
      'Access millions of songs directly from YouTube. Search and add any video to your karaoke queue.',
    color: 'text-red-400',
  },
  {
    icon: Crown,
    title: 'Smart Room Management',
    description:
      'Create private rooms with simple 6-character codes. Host controls playback and manages the experience.',
    color: 'text-yellow-400',
  },
  {
    icon: Volume2,
    title: 'Voice Chat',
    description:
      'Built-in voice communication lets you cheer each other on and chat between songs.',
    color: 'text-blue-400',
  },
  {
    icon: Zap,
    title: 'Instant Setup',
    description:
      'No downloads, no accounts required. Just create a room and start singing within seconds.',
    color: 'text-green-400',
  },
  {
    icon: Shield,
    title: 'Private & Secure',
    description:
      'Your karaoke sessions are private. Only people with your room code can join.',
    color: 'text-purple-400',
  },
];

export const stats = [
  { number: '10K+', label: 'Songs Sung', icon: Music },
  { number: '500+', label: 'Active Rooms', icon: Users },
  { number: '50+', label: 'Countries', icon: Globe },
  { number: '99%', label: 'Uptime', icon: Shield },
];

export const testimonials = [
  {
    name: 'Munchkin Man',
    role: 'New York, USA',
    avatar: 'MM',
    rating: 5,
    content:
      "Virtual Karaoke Rooms has revolutionized our remote social gatherings, infusing them with an unparalleled auditory experience. The voice clarity is impeccable, and the seamless YouTube integration elevates our sessions to professional-grade performances.",
    image:
      'https://i.pinimg.com/736x/20/e7/50/20e750c49cb15fae449d9d82f7f20929.jpg',
  },
  {
    name: 'Gmail',
    role: 'Toronto, Canada',
    avatar: 'G',
    rating: 5,
    content:
      "Having explored a myriad of virtual karaoke platforms, I can unequivocally assert that this one reigns supreme. The absence of latency, crystalline audio fidelity, and an effortlessly intuitive interface render it an absolute masterpiece.",
    image:
      'https://i.pinimg.com/736x/69/07/97/6907972278e84007c8c58cd82db56ef7.jpg',
  },
  {
    name: 'Xing Xing',
    role: 'Barcelona, Spain',
    avatar: 'XX',
    rating: 4,
    content:
      'Despite residing in disparate corners of the globe, my friends and I now revel in weekly karaoke soirées. This platform serves as a digital bridge, dissolving geographical constraints and fostering moments of unbridled joy.',
    image:
      'https://i.pinimg.com/736x/85/d8/a4/85d8a425322e0bdce44b13587b184df2.jpg',
  },
  {
    name: 'Pietro Miguel',
    role: 'Sydney, Australia',
    avatar: 'PM',
    rating: 5,
    content:
      'The private rooms feature is an exquisite innovation, perfect for momentous celebrations. Our global assembly, spanning three continents, converged in melodious harmony, transforming an ordinary birthday into an unforgettable symphony of voices.',
    image:
      'https://i.pinimg.com/736x/d5/99/7d/d5997d47c11a85f8b5bb9dcc9ae4570c.jpg',
  },
];

// Centralizable texts and CTA copy
export const hero = {
  badge: 'The Future of Online Karaoke',
  titleLine1: 'Sing Together,',
  titleLine2: 'Anywhere',
  subtitle:
    'Create magical karaoke moments with friends across the globe. Real-time sync, crystal-clear voice chat, and millions of songs at your fingertips.',
  primaryCTA: 'Start Singing Now',
  secondaryCTA: 'See How It Works',
};

export const cta = {
  title: 'Ready to Create Musical Magic?',
  description:
    "Join the KaraCoro community today. It's completely free, works in any browser, and brings people together through the power of music.",
  primary: 'Start Your Karaoke Party',
  secondary: 'Learn More',
};

export default {
  features,
  stats,
  testimonials,
  hero,
  cta,
};
