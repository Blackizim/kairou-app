import React from 'react';

// Sizing map for Tailwind classes so that the Font Awesome glyph's font-size matches the CSS box
const TW_SIZE_MAP = {
  'w-2': '8px', 'h-2': '8px',
  'w-2.5': '10px', 'h-2.5': '10px',
  'w-3': '12px', 'h-3': '12px',
  'w-3.5': '14px', 'h-3.5': '14px',
  'w-4': '16px', 'h-4': '16px',
  'w-5': '20px', 'h-5': '20px',
  'w-6': '24px', 'h-6': '24px',
  'w-7': '28px', 'h-7': '28px',
  'w-8': '32px', 'h-8': '32px',
  'w-9': '36px', 'h-9': '36px',
  'w-10': '40px', 'h-10': '40px',
  'w-11': '44px', 'h-11': '44px',
  'w-12': '48px', 'h-12': '48px',
  'w-14': '56px', 'h-14': '56px',
  'w-16': '64px', 'h-16': '64px',
  'w-20': '80px', 'h-20': '80px',
};

export function createFaIcon(baseFaClass) {
  const IconComponent = React.forwardRef(function FaIcon(props, ref) {
    const {
      size,
      className = '',
      style = {},
      color,
      strokeWidth, // Filter out SVG-only props
      stroke,
      fill,
      ...restProps
    } = props;

    const computedStyle = { ...style };

    if (size !== undefined && size !== null) {
      const s = typeof size === 'number' ? `${size}px` : size;
      computedStyle.fontSize = s;
      computedStyle.width = s;
      computedStyle.height = s;
    } else if (className) {
      const tokens = className.split(/\s+/);
      for (const t of tokens) {
        if (TW_SIZE_MAP[t]) {
          computedStyle.fontSize = TW_SIZE_MAP[t];
          break;
        } else if (t.startsWith('w-[') && t.endsWith(']')) {
          computedStyle.fontSize = t.slice(3, -1);
          break;
        } else if (t.startsWith('h-[') && t.endsWith(']')) {
          computedStyle.fontSize = t.slice(3, -1);
          break;
        }
      }
    }

    if (color) {
      computedStyle.color = color;
    } else if (fill && fill !== 'none' && fill !== 'currentColor' && !computedStyle.color) {
      // Map SVG fill prop directly to CSS color for Font Awesome glyphs
      computedStyle.color = fill;
    }

    // Auto-map Tailwind fill-* class to text-* if text color is not explicitly set
    let resolvedClassName = className;
    if (className && className.includes('fill-') && !className.includes('text-')) {
      resolvedClassName = className.replace(/\bfill-([a-zA-Z0-9_-]+)\b/g, 'text-$1 fill-$1');
    }

    return (
      <i
        ref={ref}
        className={`${baseFaClass} ${resolvedClassName}`.trim()}
        style={computedStyle}
        aria-hidden="true"
        {...restProps}
      />
    );
  });

  IconComponent.displayName = `FaIcon(${baseFaClass})`;
  return IconComponent;
}

// ==========================================
// 🏷️ BRANDS (fa-brands)
// ==========================================
export const Android = createFaIcon('fa-brands fa-android');
export const FaAndroid = Android;

export const Apple = createFaIcon('fa-brands fa-apple');
export const FaApple = Apple;

export const Discord = createFaIcon('fa-brands fa-discord');
export const DiscordIcon = Discord;
export const FaDiscord = Discord;

export const Google = createFaIcon('fa-brands fa-google');
export const FaGoogle = Google;

export const Chromecast = createFaIcon('fa-brands fa-chromecast');
export const FaChromecast = Chromecast;

// ==========================================
// 🔵 REGULAR (fa-regular)
// ==========================================
export const Clock = createFaIcon('fa-regular fa-clock');
export const FaClock = Clock;

// ==========================================
// 🟠 SOLID (fa-solid) — PRINCIPAIS & SISTEMA
// ==========================================
export const Play = createFaIcon('fa-solid fa-play');
export const FaPlay = Play;

export const Film = createFaIcon('fa-solid fa-film');
export const FaFilm = Film;

export const Tv = createFaIcon('fa-solid fa-tv');
export const FaTv = Tv;

export const Search = createFaIcon('fa-solid fa-magnifying-glass');
export const MagnifyingGlass = Search;
export const FaMagnifyingGlass = Search;

export const House = createFaIcon('fa-solid fa-house');
export const Home = House;
export const FaHouse = House;

export const Bookmark = createFaIcon('fa-solid fa-bookmark');
export const FaBookmark = Bookmark;

export const Crown = createFaIcon('fa-solid fa-crown');
export const FaCrown = Crown;

export const Gem = createFaIcon('fa-solid fa-gem');
export const FaGem = Gem;

export const Star = createFaIcon('fa-solid fa-star');
export const FaStar = Star;

export const Fire = createFaIcon('fa-solid fa-fire');
export const Flame = Fire;
export const FaFire = Fire;

export const Bolt = createFaIcon('fa-solid fa-bolt');
export const Zap = Bolt;
export const FaBolt = Bolt;

export const ClockRotateLeft = createFaIcon('fa-solid fa-clock-rotate-left');
export const History = ClockRotateLeft;
export const FaClockRotateLeft = ClockRotateLeft;

export const Heart = createFaIcon('fa-solid fa-heart');
export const FaHeart = Heart;

export const Bell = createFaIcon('fa-solid fa-bell');
export const BellRing = Bell;
export const FaBell = Bell;

export const Gear = createFaIcon('fa-solid fa-gear');
export const Settings = Gear;
export const FaGear = Gear;

export const ShieldHalved = createFaIcon('fa-solid fa-shield-halved');
export const Shield = ShieldHalved;
export const ShieldCheck = ShieldHalved;
export const ShieldAlert = ShieldHalved;
export const FaShieldHalved = ShieldHalved;

export const SatelliteDish = createFaIcon('fa-solid fa-satellite-dish');
export const Radio = SatelliteDish;
export const FaSatelliteDish = SatelliteDish;

export const Futbol = createFaIcon('fa-solid fa-futbol');
export const FaFutbol = Futbol;

export const Clapperboard = createFaIcon('fa-solid fa-clapperboard');
export const FaClapperboard = Clapperboard;

export const MasksTheater = createFaIcon('fa-solid fa-masks-theater');
export const FaMasksTheater = MasksTheater;

export const Bars = createFaIcon('fa-solid fa-bars');
export const Menu = Bars;
export const FaBars = Bars;

export const Xmark = createFaIcon('fa-solid fa-xmark');
export const X = Xmark;
export const FaXmark = Xmark;

export const ChevronDown = createFaIcon('fa-solid fa-chevron-down');
export const FaChevronDown = ChevronDown;

export const ChevronLeft = createFaIcon('fa-solid fa-chevron-left');
export const FaChevronLeft = ChevronLeft;

export const ChevronRight = createFaIcon('fa-solid fa-chevron-right');
export const FaChevronRight = ChevronRight;

export const ChevronUp = createFaIcon('fa-solid fa-chevron-up');
export const FaChevronUp = ChevronUp;

export const ArrowLeft = createFaIcon('fa-solid fa-arrow-left');
export const FaArrowLeft = ArrowLeft;

export const ArrowRight = createFaIcon('fa-solid fa-arrow-right');
export const FaArrowRight = ArrowRight;

export const ArrowUp = createFaIcon('fa-solid fa-arrow-up');
export const FaArrowUp = ArrowUp;

export const ArrowDown = createFaIcon('fa-solid fa-arrow-down');
export const FaArrowDown = ArrowDown;

export const Expand = createFaIcon('fa-solid fa-expand');
export const Maximize = Expand;
// Maximize2 = Proporção/Aspect ratio → ícone de arrows para não confundir com fullscreen
export const Maximize2 = createFaIcon('fa-solid fa-up-right-and-down-left-from-center');
export const FaExpand = Expand;

export const Compress = createFaIcon('fa-solid fa-compress');
export const Minimize = Compress;
export const FaCompress = Compress;

export const VolumeHigh = createFaIcon('fa-solid fa-volume-high');
export const Volume2 = VolumeHigh;
export const Volume = VolumeHigh;
export const FaVolumeHigh = VolumeHigh;

export const VolumeXmark = createFaIcon('fa-solid fa-volume-xmark');
export const VolumeX = VolumeXmark;
export const FaVolumeXmark = VolumeXmark;

export const VolumeLow = createFaIcon('fa-solid fa-volume-low');
export const Volume1 = VolumeLow;
export const FaVolumeLow = VolumeLow;

export const ClosedCaptioning = createFaIcon('fa-solid fa-closed-captioning');
export const Subtitles = ClosedCaptioning;
export const FaClosedCaptioning = ClosedCaptioning;

export const ForwardStep = createFaIcon('fa-solid fa-forward-step');
export const SkipForward = ForwardStep;
export const FaForwardStep = ForwardStep;

export const BackwardStep = createFaIcon('fa-solid fa-backward-step');
export const SkipBack = BackwardStep;
export const FaBackwardStep = BackwardStep;

export const RotateLeft = createFaIcon('fa-solid fa-rotate-left');
export const RotateCcw = RotateLeft;
export const FaRotateLeft = RotateLeft;

export const RotateRight = createFaIcon('fa-solid fa-rotate-right');
export const RotateCw = RotateRight;
export const FaRotateRight = RotateRight;

export const User = createFaIcon('fa-solid fa-user');
export const FaUser = User;

export const Users = createFaIcon('fa-solid fa-users');
export const FaUsers = Users;

export const TrashCan = createFaIcon('fa-solid fa-trash-can');
export const Trash2 = TrashCan;
export const Trash = TrashCan;
export const FaTrashCan = TrashCan;

export const Lock = createFaIcon('fa-solid fa-lock');
export const FaLock = Lock;

export const UnlockKeyhole = createFaIcon('fa-solid fa-unlock-keyhole');
export const Unlock = UnlockKeyhole;
export const FaUnlockKeyhole = UnlockKeyhole;

export const Envelope = createFaIcon('fa-solid fa-envelope');
export const Mail = Envelope;
export const FaEnvelope = Envelope;

export const CreditCard = createFaIcon('fa-solid fa-credit-card');
export const FaCreditCard = CreditCard;

export const Headset = createFaIcon('fa-solid fa-headset');
export const Headphones = Headset;
export const FaHeadset = Headset;

// ==========================================
// DEMAIS ÍCONES UTILITÁRIOS MAPEADOS
// ==========================================
export const Activity = createFaIcon('fa-solid fa-chart-line');
export const Airplay = createFaIcon('fa-solid fa-tower-broadcast');
export const Cast = createFaIcon('fa-solid fa-tv');
export const AlertCircle = createFaIcon('fa-solid fa-circle-exclamation');
export const AlertTriangle = createFaIcon('fa-solid fa-triangle-exclamation');
export const Baby = createFaIcon('fa-solid fa-baby');
export const BookOpen = createFaIcon('fa-solid fa-book-open');
export const Calendar = createFaIcon('fa-solid fa-calendar-days');
export const Check = createFaIcon('fa-solid fa-check');
export const CheckCircle = createFaIcon('fa-solid fa-circle-check');
export const CheckCircle2 = CheckCircle;
export const Compass = createFaIcon('fa-solid fa-compass');
export const Copy = createFaIcon('fa-solid fa-copy');
export const Download = createFaIcon('fa-solid fa-download');
export const Edit3 = createFaIcon('fa-solid fa-pen-to-square');
export const ExternalLink = createFaIcon('fa-solid fa-arrow-up-right-from-square');
export const Eye = createFaIcon('fa-solid fa-eye');
export const EyeOff = createFaIcon('fa-solid fa-eye-slash');
export const Globe = createFaIcon('fa-solid fa-globe');
export const Info = createFaIcon('fa-solid fa-circle-info');
export const Layers = createFaIcon('fa-solid fa-layer-group');
export const Link = createFaIcon('fa-solid fa-link');
export const Loader2 = createFaIcon('fa-solid fa-circle-notch fa-spin');
export const LogIn = createFaIcon('fa-solid fa-right-to-bracket');
export const LogOut = createFaIcon('fa-solid fa-right-from-bracket');
export const MessageCircle = createFaIcon('fa-solid fa-comment');
export const MessageSquare = createFaIcon('fa-solid fa-message');
export const Minus = createFaIcon('fa-solid fa-minus');
export const Monitor = createFaIcon('fa-solid fa-desktop');
export const Newspaper = createFaIcon('fa-solid fa-newspaper');
export const Palette = createFaIcon('fa-solid fa-palette');
export const Pause = createFaIcon('fa-solid fa-pause');
export const Plus = createFaIcon('fa-solid fa-plus');
export const RefreshCw = createFaIcon('fa-solid fa-arrows-rotate');
export const Send = createFaIcon('fa-solid fa-paper-plane');
export const Server = createFaIcon('fa-solid fa-server');
export const Sliders = createFaIcon('fa-solid fa-sliders');
export const SlidersHorizontal = Sliders;
export const Sparkles = createFaIcon('fa-solid fa-wand-magic-sparkles');
export const Swords = createFaIcon('fa-solid fa-hand-fist');
export const Trophy = createFaIcon('fa-solid fa-trophy');
export const Type = createFaIcon('fa-solid fa-font');
export const Wifi = createFaIcon('fa-solid fa-wifi');

const allIcons = {
  Android, FaAndroid,
  Apple, FaApple,
  Discord, DiscordIcon, FaDiscord,
  Google, FaGoogle,
  Chromecast, FaChromecast,
  Clock, FaClock,
  Play, FaPlay,
  Film, FaFilm,
  Tv, FaTv,
  Search, MagnifyingGlass, FaMagnifyingGlass,
  House, Home, FaHouse,
  Bookmark, FaBookmark,
  Crown, FaCrown,
  Gem, FaGem,
  Star, FaStar,
  Fire, Flame, FaFire,
  Bolt, Zap, FaBolt,
  ClockRotateLeft, History, FaClockRotateLeft,
  Heart, FaHeart,
  Bell, BellRing, FaBell,
  Gear, Settings, FaGear,
  ShieldHalved, Shield, ShieldCheck, ShieldAlert, FaShieldHalved,
  SatelliteDish, Radio, FaSatelliteDish,
  Futbol, FaFutbol,
  Clapperboard, FaClapperboard,
  MasksTheater, FaMasksTheater,
  Bars, Menu, FaBars,
  Xmark, X, FaXmark,
  ChevronDown, FaChevronDown,
  ChevronLeft, FaChevronLeft,
  ChevronRight, FaChevronRight,
  ChevronUp, FaChevronUp,
  ArrowLeft, FaArrowLeft,
  ArrowRight, FaArrowRight,
  ArrowUp, FaArrowUp,
  ArrowDown, FaArrowDown,
  Expand, Maximize, Maximize2, FaExpand,
  Compress, Minimize, FaCompress,
  VolumeHigh, Volume2, Volume, FaVolumeHigh,
  VolumeXmark, VolumeX, FaVolumeXmark,
  VolumeLow, Volume1, FaVolumeLow,
  ClosedCaptioning, Subtitles, FaClosedCaptioning,
  ForwardStep, SkipForward, FaForwardStep,
  BackwardStep, SkipBack, FaBackwardStep,
  RotateLeft, RotateCcw, FaRotateLeft,
  RotateRight, RotateCw, FaRotateRight,
  User, FaUser,
  Users, FaUsers,
  TrashCan, Trash2, Trash, FaTrashCan,
  Lock, FaLock,
  UnlockKeyhole, Unlock, FaUnlockKeyhole,
  Envelope, Mail, FaEnvelope,
  CreditCard, FaCreditCard,
  Headset, Headphones, FaHeadset,
  Activity, Airplay, Cast, AlertCircle, AlertTriangle, Baby, BookOpen,
  Calendar, Check, CheckCircle, CheckCircle2, Compass, Copy, Download,
  Edit3, ExternalLink, Eye, EyeOff, Globe, Info, Layers, Link, Loader2,
  LogIn, LogOut, MessageCircle, MessageSquare, Minus, Monitor, Newspaper,
  Palette, Pause, Plus, RefreshCw, Send, Server, Sliders, SlidersHorizontal,
  Sparkles, Swords, Trophy, Type, Wifi,
};

export default allIcons;
