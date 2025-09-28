// Temporary type fix for Lucide React icons
declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
  }
  
  export const Music: FC<LucideProps>;
  export const AlertTriangle: FC<LucideProps>;
  export const RotateCcw: FC<LucideProps>;
  export const Play: FC<LucideProps>;
  export const Pause: FC<LucideProps>;
  export const Users: FC<LucideProps>;
  export const SkipForward: FC<LucideProps>;
  export const VolumeX: FC<LucideProps>;
  export const Volume2: FC<LucideProps>;
  export const MessageCircle: FC<LucideProps>;
  export const Send: FC<LucideProps>;
  export const Crown: FC<LucideProps>;
  export const ArrowLeft: FC<LucideProps>;
  export const Wifi: FC<LucideProps>;
  export const WifiOff: FC<LucideProps>;
  export const Zap: FC<LucideProps>;
  export const Shield: FC<LucideProps>;
  export const Globe: FC<LucideProps>;
  export const Heart: FC<LucideProps>;
  export const Sparkles: FC<LucideProps>;
  export const Mic: FC<LucideProps>;
  export const ArrowRight: FC<LucideProps>;
  export const Star: FC<LucideProps>;
  export const ChevronRight: FC<LucideProps>;
  export const ChevronLeft: FC<LucideProps>;
  export const ChevronDown: FC<LucideProps>;
  export const ChevronUp: FC<LucideProps>;
  export const Search: FC<LucideProps>;
  export const Dot: FC<LucideProps>;
  export const Home: FC<LucideProps>;
  export const GripVertical: FC<LucideProps>;
  export const RefreshCw: FC<LucideProps>;
  export const X: FC<LucideProps>;
  export const Check: FC<LucideProps>;
  export const Loader2: FC<LucideProps>;
  export const Copy: FC<LucideProps>;
  export const ArrowUpRight: FC<LucideProps>;
  export const ArrowUpLeft: FC<LucideProps>;
  export const ArrowDownRight: FC<LucideProps>;
  export const ArrowDownLeft: FC<LucideProps>;
  export const Plus: FC<LucideProps>;
  export const Trash2: FC<LucideProps>;
  export const Clock: FC<LucideProps>;
  export const User: FC<LucideProps>;
  export const ExternalLink: FC<LucideProps>;
  export const Eye: FC<LucideProps>;
  export const PlayCircle: FC<LucideProps>;
  export const ListMusic: FC<LucideProps>;
  export const Edit3: FC<LucideProps>;
  export const MicOff: FC<LucideProps>;
  export const Settings: FC<LucideProps>;
  export const MoreHorizontal: FC<LucideProps>;
  export const Circle: FC<LucideProps>;
  export const Mic2: FC<LucideProps>;
}