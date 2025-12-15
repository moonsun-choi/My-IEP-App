

import { 
    // 기본
    Target, 
    
    // 1. 감정 및 정서 (Emotion)
    Smile,      // 행복/긍정
    Frown,      // 슬픔
    Meh,        // 시무룩/무표정
    Zap,        // 놀람 (충격/번개)
    Flame,      // 화남 (열기/불꽃)
    Heart,      // 정서적 유대감
    
    // 2. 의사표현 (Communication)
    MessageCircle, // 언어적 표현
    Hand,          // 비언어적 표현 (지시하기, 손짓)
    Mic,           // 발화
    Ear,           // 경청하기
    Circle,        // 동그라미 (O)
    X,             // 엑스 (X)
    
    // 3. 식사 (Eating) - Removed generic Utensils/Soup/Chopsticks/GlassWater imports
    Apple,      // 편식 지도, 건강한 식습관

    // 4. 위생 및 신변처리 (Hygiene & Self-care)
    Droplet,    // 세수하기, 손 씻기
    Bath,       // 목욕, 몸단장
    Accessibility, // 대소변 가리기 (화장실 이용)
    Baby,       // 기저귀/개인 위생 관리
    Scroll,     // 두루마리 휴지/뒷처리
    
    // 5. 착탈의 (Dressing)
    Shirt,      // 티셔츠/상의
    Footprints, // 신발 신고 벗기

    // 6. 사회성 (Social Skills)
    Users,      // 또래 상호작용
    Handshake,  // 인사하기, 약속 지키기
    Gamepad2,   // 놀이 규칙, 순서 지키기
    Sparkles,   // 칭찬하기, 긍정적 태도

    // 7. 안전 (Safety)
    Shield,     // 위험 상황 인지, 신변 안전
    Siren,      // 비상 대처, 긴급 상황
    AlertTriangle, // 위험물 구별

    // 8. 학습 태도 및 인지 (Cognition)
    Eye,        // 눈 맞춤 (Eye Contact)
    Brain,      // 집중하기, 주의력
    Clock,      // 기다리기, 착석 유지
    CheckCircle2, // 과제 완수
    Lightbulb,  // 문제 해결, 인지

    // 9. 교과 학습 (Academics)
    BookOpen,   // 읽기, 국어
    Pencil,     // 쓰기, 선 긋기
    Calculator, // 수학, 숫자 세기
    Laptop,     // 컴퓨터 활용
    
    // 10. 신체 및 소근육 (Motor Skills)
    Scissors,   // 가위질, 소근육
    Dumbbell,   // 대근육, 체육
    Box,        // 정리하기, 물건 옮기기

    // 11. 예체능 (Arts)
    Music,      // 음악 활동, 리듬
    Palette,    // 미술, 색칠하기

    // 12. 지역사회 (Community)
    Bus,        // 대중교통 이용
    ShoppingCart, // 마트 이용, 돈 계산
    MapPin      // 길 찾기
} from 'lucide-react';
import React from 'react';

// --- Custom SVG Icons (for missing or specific items) ---

const ChopsticksIcon = (props: any) => React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props
}, React.createElement("path", {
  d: "M5.5 21.5 21.5 5.5"
}), React.createElement("path", {
  d: "m2.5 18.5 16-16"
}));

const ForkIcon = (props: any) => React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props
}, React.createElement("path", {
  d: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"
}), React.createElement("path", {
  d: "M7 2v20"
}));

const SpoonIcon = (props: any) => React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props
}, React.createElement("path", {
  d: "M12 2C16 2 18 4 18 8C18 11.5 15.5 14 12 14C8.5 14 6 11.5 6 8C6 4 8 2 12 2Z"
}), React.createElement("path", {
  d: "M12 14V22"
}));

const CupIcon = (props: any) => React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props
}, React.createElement("path", {
  d: "M17 2h-6c-1.1 0-2 .9-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4c0-1.1-.9-2-2-2Z"
}), React.createElement("path", {
  d: "M6 2v16c0 1.1.9 2 2 2h8"
}), React.createElement("path", {
  d: "M19 8h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"
}));

const WaterBottleIcon = (props: any) => React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props
}, React.createElement("path", {
  d: "M9 2h6v2H9z"
}), React.createElement("path", {
  d: "M7 6h10v3H7z"
}), React.createElement("path", {
  d: "M8 9h8v11a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2Z"
}));

const PantsIcon = (props: any) => React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props
}, React.createElement("path", {
  d: "M6 4H18A2 2 0 0 1 20 6V21A1 1 0 0 1 19 22H16A1 1 0 0 1 15 21L12 14L9 21A1 1 0 0 1 8 22H5A1 1 0 0 1 4 21V6A2 2 0 0 1 6 4Z"
}), React.createElement("path", {
  d: "M4 8H20"
}));

const HangerIcon = (props: any) => React.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props
}, React.createElement("path", {
  d: "M12 2a3 3 0 0 1 3 3v2h-6V5a3 3 0 0 1 3-3Z"
}), React.createElement("path", {
  d: "m2 11 10-6 10 6"
}), React.createElement("path", {
  d: "M2 11h20v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2Z"
}));

// 카테고리별로 주석을 달았으나, 실제 객체는 평탄화(Flat)하여 내보냅니다.
export const GOAL_ICONS: Record<string, React.ElementType> = {
    // Default
    target: Target,

    // 1. 감정표현 (Emotion) - Expanded
    emotion_happy: Smile,
    emotion_sad: Frown,
    emotion_sullen: Meh,
    emotion_surprised: Zap,
    emotion_angry: Flame,
    emotion_bond: Heart,

    // 2. 의사표현 (Communication) & Gestures
    comm_verbal: MessageCircle,
    comm_speech: Mic,
    comm_listen: Ear,
    comm_gesture: Hand,
    gesture_o: Circle,
    gesture_x: X,

    // 3. 식사 (Eating) - Refined with Custom Icons
    eat_fork: ForkIcon,
    eat_spoon: SpoonIcon,
    eat_chopsticks: ChopsticksIcon,
    eat_cup: CupIcon,
    eat_water: WaterBottleIcon,
    eat_health: Apple,

    // 4. 위생 (Hygiene) & 5. 대소변 (Toileting)
    hygiene_wash: Droplet,
    hygiene_bath: Bath,
    toilet_use: Accessibility,
    self_care: Baby,
    hygiene_paper: Scroll,

    // 6. 착탈의 (Dressing) - Refined with Custom Icons
    dress_tshirt: Shirt,
    dress_pants: PantsIcon,
    dress_hanger: HangerIcon,
    dress_shoes: Footprints,

    // 7. 사회성 (Social)
    social_peer: Users,
    social_greet: Handshake,
    social_play: Gamepad2,
    social_attitude: Sparkles,

    // 8. 안전 (Safety)
    safety_general: Shield,
    safety_emergency: Siren,
    safety_caution: AlertTriangle,

    // 9. 학습태도/인지 (Cognition)
    attn_eye: Eye,
    attn_focus: Brain,
    attn_wait: Clock,
    attn_finish: CheckCircle2,
    cognition_solve: Lightbulb,

    // 10. 교과 학습 (Academics)
    study_read: BookOpen,
    study_write: Pencil,
    study_math: Calculator,
    study_comp: Laptop,

    // 11. 신체/소근육 (Motor)
    motor_fine: Scissors,
    motor_gross: Dumbbell,
    motor_organize: Box,

    // 12. 예체능 (Arts)
    art_music: Music,
    art_draw: Palette,

    // 13. 지역사회 (Community)
    comm_transport: Bus,
    comm_shop: ShoppingCart,
    comm_nav: MapPin
};

export const getGoalIcon = (iconKey?: string) => {
    return GOAL_ICONS[iconKey || 'target'] || Target;
};
