import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Coins, 
  MapPin, 
  Clock, 
  Shield, 
  Bus, 
  Store, 
  GraduationCap, 
  Car,
  Rocket,
  CheckCircle,
  Edit,
  SearchCheck,
  Handshake
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const features = [
    { icon: MapPin, text: 'Find nearby exchanges', color: 'text-green-400' },
    { icon: Clock, text: 'Real-time matching', color: 'text-green-400' },
    { icon: Shield, text: 'Safe & secure', color: 'text-green-400' },
  ];

  const steps = [
    {
      number: '1',
      title: 'Post Your Need',
      description: 'Tell us what you have and what you need. "I have ₱1000, need ₱20 coins"',
      icon: Edit,
      color: 'bg-blue-500',
    },
    {
      number: '2',
      title: 'Find Matches',
      description: "We'll find nearby users who have what you need and need what you have",
      icon: SearchCheck,
      color: 'bg-green-500',
    },
    {
      number: '3',
      title: 'Meet & Exchange',
      description: 'Meet at a safe location, exchange cash, and rate your experience',
      icon: Handshake,
      color: 'bg-purple-500',
    },
  ];

  const userTypes = [
    { icon: Bus, title: 'Commuters', description: 'Need exact fare for jeeps, tricycles, and buses', color: 'text-cyan-400' },
    { icon: Store, title: 'Store Owners', description: 'Convert coins to bills for easier banking', color: 'text-green-400' },
    { icon: GraduationCap, title: 'Students', description: 'Get smaller bills for daily expenses', color: 'text-yellow-400' },
    { icon: Car, title: 'Drivers', description: 'Always have change for passengers', color: 'text-red-400' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect fixed top-0 left-0 right-0 z-50 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Coins className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-white font-bold text-xl">Kolekta</span>
          </div>
          <Button 
            variant="ghost" 
            onClick={onLogin}
            className="glass-effect text-white hover:bg-white hover:bg-opacity-20"
          >
            Login
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 pt-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center md:text-left"
          >
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Change the way you{' '}
              <span className="text-yellow-400">get change</span>
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 mb-8 leading-relaxed">
              Real-time peer-to-peer cash exchange for commuters and daily use. Never worry about exact change again.
            </p>
            
            {/* Feature highlights */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center text-blue-100"
                >
                  <feature.icon className={`mr-3 h-5 w-5 ${feature.color}`} />
                  <span>{feature.text}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button 
                onClick={onGetStarted}
                size="lg"
                className="floating-btn bg-white text-blue-600 hover:bg-opacity-90 mb-4"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Get Started
              </Button>
              
              <p className="text-sm text-blue-200">
                <CheckCircle className="inline mr-1 h-4 w-4" />
                Free to use • No fees • Community-driven
              </p>
            </motion.div>
          </motion.div>

          {/* Phone Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {/* Glowing ring effect */}
              <div className="absolute inset-0 bg-white opacity-20 rounded-3xl pulse-ring"></div>
              
              {/* Phone Frame */}
              <Card className="glass-effect rounded-3xl p-4 w-72 relative border-white/20">
                <div className="bg-gray-900 rounded-2xl p-6 text-white">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center mb-6 text-sm">
                    <span>9:41</span>
                    <div className="flex space-x-1">
                      <div className="w-4 h-2 bg-white rounded-sm"></div>
                      <div className="w-4 h-2 bg-white rounded-sm"></div>
                      <div className="w-4 h-2 bg-white rounded-sm"></div>
                    </div>
                  </div>
                  
                  {/* App Content */}
                  <div className="text-center">
                    <Card className="gradient-card rounded-2xl p-6 mb-4 border-none">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <span className="text-2xl font-bold">₱1,000</span>
                          <p className="text-xs opacity-75">Give</p>
                        </div>
                        <div className="text-cyan-400 text-xl">⇄</div>
                        <div>
                          <span className="text-lg">₱20 x50</span>
                          <p className="text-xs opacity-75">Coins</p>
                        </div>
                      </div>
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs inline-flex items-center">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Match found nearby!
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="py-20 px-4"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            How Kolekta Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              >
                <Card className="glass-effect rounded-2xl p-8 text-center hover:bg-white/10 transition-all duration-300 border-white/20">
                  <div className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center mx-auto mb-6`}>
                    <span className="text-2xl font-bold text-white">{step.number}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{step.title}</h3>
                  <p className="text-blue-100">{step.description}</p>
                  <div className="mt-6 p-4 bg-blue-500 bg-opacity-20 rounded-lg">
                    <step.icon className="text-cyan-400 text-2xl mx-auto h-8 w-8" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Perfect For Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="py-20 px-4"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Perfect For
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {userTypes.map((type, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              >
                <Card className="glass-effect rounded-xl p-6 text-center hover:bg-white/10 transition-all duration-300 border-white/20">
                  <type.icon className={`h-10 w-10 ${type.color} mb-4 mx-auto`} />
                  <h3 className="text-lg font-semibold text-white mb-2">{type.title}</h3>
                  <p className="text-blue-100 text-sm">{type.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="glass-effect py-8 px-4"
      >
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Coins className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-white font-bold text-xl">Kolekta</span>
          </div>
          <p className="bg-gradient-to-r from-yellow-400 via-cyan-400 to-green-400 bg-clip-text text-transparent font-semibold text-lg mb-4">"Kolekta—barya or buo, you choose."</p>
          <p className="text-blue-200 text-sm">© 2024 Kolekta. Building communities through cash exchange.</p>
        </div>
      </motion.footer>
    </div>
  );
}
