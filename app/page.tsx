"use client";

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Music, Users, Mic, Star, Play, Volume2, Crown, Zap, Shield, Globe, Heart, Sparkles } from "lucide-react";
import Link from "next/link";
import { RoomCreator } from "@/components/room/RoomCreator";
import { RoomJoiner } from "@/components/room/RoomJoiner";
import { trackPageView, trackKaraokeEvent } from '@/lib/analytics';

export default function Home() {
  useEffect(() => {
    trackPageView('home');
  }, []);

  const handleGetStartedClick = () => {
    trackKaraokeEvent('get_started_clicked');
    document.getElementById('room-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleHowItWorksClick = () => {
    trackKaraokeEvent('how_it_works_clicked');
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: Users,
      title: "Real-time Sync",
      description: "Everyone watches and sings along in perfect sync, no matter where they are in the world.",
      color: "text-red-400"
    },
    {
      icon: Music,
      title: "YouTube Integration",
      description: "Access millions of songs directly from YouTube. Search and add any video to your karaoke queue.",
      color: "text-red-400"
    },
    {
      icon: Crown,
      title: "Smart Room Management",
      description: "Create private rooms with simple 6-character codes. Host controls playback and manages the experience.",
      color: "text-yellow-400"
    },
    {
      icon: Volume2,
      title: "Voice Chat",
      description: "Built-in voice communication lets you cheer each other on and chat between songs.",
      color: "text-blue-400"
    },
    {
      icon: Zap,
      title: "Instant Setup",
      description: "No downloads, no accounts required. Just create a room and start singing within seconds.",
      color: "text-green-400"
    },
    {
      icon: Shield,
      title: "Private & Secure",
      description: "Your karaoke sessions are private. Only people with your room code can join.",
      color: "text-purple-400"
    }
  ];

  const stats = [
    { number: "10K+", label: "Songs Sung", icon: Music },
    { number: "500+", label: "Active Rooms", icon: Users },
    { number: "50+", label: "Countries", icon: Globe },
    { number: "99%", label: "Uptime", icon: Shield }
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Music Teacher",
      content: "KaraCoro has revolutionized how I conduct virtual music classes. The sync is perfect!",
      rating: 5
    },
    {
      name: "Mike R.",
      role: "Party Host",
      content: "Best karaoke app ever! We use it for all our virtual parties. Everyone loves it.",
      rating: 5
    },
    {
      name: "Lisa K.",
      role: "Remote Team Lead",
      content: "Great for team building! Our remote team bonding sessions are so much fun now.",
      rating: 5
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-50 px-4 py-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">KaraCoro</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={handleHowItWorksClick}
              className="text-gray-300 hover:text-white transition-colors"
            >
              How it Works
            </button>
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Features
            </button>
            <Button 
              onClick={handleGetStartedClick}
              className="bg-red-500 hover:bg-red-600"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-black/30" />
        <div className="container relative z-10 mx-auto text-center max-w-6xl">
          <div className="mb-8">
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              The Future of Online Karaoke
            </Badge>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              Sing Together,
              <br />
              <span className="text-red-500 relative">
                Anywhere
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-red-500 rounded-full"></div>
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Create magical karaoke moments with friends across the globe. Real-time sync, crystal-clear voice chat, and millions of songs at your fingertips.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              className="bg-red-500 hover:bg-red-600 text-lg px-8 py-4 h-14 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300"
              onClick={handleGetStartedClick}
            >
              <Play className="mr-2 w-5 h-5" />
              Start Singing Now
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white text-lg px-8 py-4 h-14 transition-all duration-300"
              onClick={handleHowItWorksClick}
            >
              <Volume2 className="mr-2 w-5 h-5" />
              See How It Works
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className="w-6 h-6 text-red-400 mr-2" />
                  <span className="text-3xl md:text-4xl font-bold text-white">{stat.number}</span>
                </div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Room Creation/Joining Section */}
      <section id="room-section" className="py-20 bg-black/40 backdrop-blur-sm min-h-screen flex justify-center items-center">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start Your <span className="text-red-500">Karaoke Session</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Create a private room or join an existing one. It takes less than 30 seconds to get started.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <RoomCreator />
            <RoomJoiner />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 min-h-screen flex justify-center items-center">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose <span className="text-red-500">KaraCoro</span>?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              We've built the most advanced online karaoke platform with features that make singing together feel natural and fun.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 bg-gray-900/50 border-red-500/30 hover:border-red-500/60 transition-all duration-300 hover:scale-105 group">
                <feature.icon className={`w-12 h-12 ${feature.color} mb-4 group-hover:scale-110 transition-transform duration-300`} />
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-black/40 backdrop-blur-sm min-h-screen flex justify-center items-center">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              How It <span className="text-red-500">Works</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Getting started with KaraCoro is incredibly simple. Follow these three easy steps.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Create or Join",
                  description: "Create a new room or join an existing one with a 6-character room code. Share the code with friends.",
                  icon: Users
                },
                {
                  step: "2", 
                  title: "Add Songs",
                  description: "Search for your favorite karaoke songs on YouTube and add them to the queue. Everyone can contribute!",
                  icon: Music
                },
                {
                  step: "3",
                  title: "Sing Together",
                  description: "Take turns singing while everyone watches in perfect sync. Chat, cheer, and have amazing fun!",
                  icon: Mic
                }
              ].map((item, index) => (
                <div key={index} className="text-center group">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-red-500/25">
                      {item.step}
                    </div>
                    <item.icon className="w-8 h-8 text-red-400 mx-auto" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              What People <span className="text-red-500">Say</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Join thousands of happy singers who've made KaraCoro their go-to karaoke platform.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 bg-gray-900/50 border-red-500/30 hover:border-red-500/60 transition-all duration-300">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-6 bg-gradient-to-r from-red-600 to-red-800">
        <div className="container px-4 mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <Heart className="w-16 h-16 text-white mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white">
              Ready to Create <span className="text-red-200">Musical Magic</span>?
            </h2>
            <p className="text-xl text-red-100 mb-12 leading-relaxed">
              Join the KaraCoro community today. It's completely free, works in any browser, and brings people together through the power of music.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-red-600 hover:bg-gray-100 text-lg px-8 py-4 h-14 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => {
                  trackKaraokeEvent('cta_start_karaoke_clicked');
                  document.getElementById('room-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Start Your Karaoke Party
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white text-white hover:bg-white text-red-600 text-lg px-8 py-4 h-14 transition-all duration-300"
                onClick={handleHowItWorksClick}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-black">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">KaraCoro</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>© 2024 KaraCoro. Made with ❤️ for music lovers.</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}