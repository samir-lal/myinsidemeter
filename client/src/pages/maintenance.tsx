import { Moon, Sparkles, Clock, Heart } from "lucide-react";

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo and Brand */}
        <div className="mb-8">
          <div className="relative inline-block">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Moon className="w-10 h-10 text-white" />
            </div>
            <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">InsideMeter</h1>
          <p className="text-purple-200 text-sm">Track Your Inner Journey</p>
        </div>

        {/* Maintenance Message */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-6">
          <Clock className="w-12 h-12 text-blue-300 mx-auto mb-4 animate-spin" style={{animationDuration: '3s'}} />
          
          <h2 className="text-2xl font-semibold text-white mb-4">
            Under Maintenance
          </h2>
          
          <p className="text-gray-200 mb-6 leading-relaxed">
            We're currently enhancing your InsideMeter experience with exciting new features and improvements. 
            Our team is working hard to bring you better mood tracking and deeper insights.
          </p>
          
          <div className="flex items-center justify-center text-pink-300 mb-4">
            <Heart className="w-5 h-5 mr-2 animate-pulse" />
            <span className="text-sm">Thank you for your patience</span>
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <p className="text-gray-300 text-sm mb-2">
            <span className="font-medium">Expected Return:</span> Shortly
          </p>
          <p className="text-gray-300 text-sm">
            <span className="font-medium">Status:</span> Deploying Updates
          </p>
        </div>

        {/* Contact */}
        <div className="text-center">
          <p className="text-gray-400 text-xs mb-2">
            Need immediate assistance?
          </p>
          <a 
            href="mailto:support@insidemeter.com" 
            className="text-blue-300 hover:text-blue-200 text-sm underline transition-colors"
          >
            Contact Support
          </a>
        </div>

        {/* Animated Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
          <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/6 w-1 h-1 bg-pink-400 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
        </div>
      </div>
    </div>
  );
}