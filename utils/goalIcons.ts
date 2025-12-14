
import { 
    // 기본
    Target, 
    
    // 1. 감정 및 정서 (Emotion)
    Smile,      // 긍정적 표현, 웃기
    Frown,      // 부정적 감정 조절
    Heart,      // 정서적 유대감
    
    // 2. 의사표현 (Communication)
    MessageCircle, // 언어적 표현
    Hand,          // 비언어적 표현 (지시하기, 손짓)
    Mic,           // 발화
    Ear,           // 경청하기
    
    // 3. 식사 (Eating)
    Utensils,   // 식사 도구 사용, 식사 예절
    Coffee,     // 마시기 (컵 사용)
    Apple,      // 편식 지도, 건강한 식습관

    // 4. 위생 및 신변처리 (Hygiene & Self-care)
    Droplet,    // 세수하기, 손 씻기
    Bath,       // 목욕, 몸단장
    Accessibility, // 대소변 가리기 (화장실 이용)
    Baby,       // 기저귀/개인 위생 관리
    
    // 5. 착탈의 (Dressing)
    Shirt,      // 옷 입고 벗기
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

    // 8. 학습 태도 (Learning Attitude)
    Eye,        // 눈 맞춤 (Eye Contact)
    Brain,      // 집중하기, 주의력
    Clock,      // 기다리기, 착석 유지
    CheckCircle2 // 과제 완수
} from 'lucide-react';
import React from 'react';

// 카테고리별로 주석을 달았으나, 실제 객체는 평탄화(Flat)하여 내보냅니다.
export const GOAL_ICONS: Record<string, React.ElementType> = {
    // Default
    target: Target,

    // 1. 감정표현 (Emotion)
    emotion_happy: Smile,
    emotion_control: Frown,
    emotion_bond: Heart,

    // 2. 의사표현 (Communication)
    comm_verbal: MessageCircle,
    comm_gesture: Hand,
    comm_speech: Mic,
    comm_listen: Ear,

    // 3. 식사 (Eating)
    eat_meal: Utensils,
    eat_drink: Coffee,
    eat_health: Apple,

    // 4. 위생 (Hygiene) & 5. 대소변 (Toileting)
    hygiene_wash: Droplet,
    hygiene_bath: Bath,
    toilet_use: Accessibility,
    self_care: Baby,

    // 6. 착탈의 (Dressing)
    dress_clothes: Shirt,
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

    // 9. 학습태도 (Attitude)
    attn_eye: Eye,
    attn_focus: Brain,
    attn_wait: Clock,
    attn_finish: CheckCircle2,
};

export const getGoalIcon = (iconKey?: string) => {
    return GOAL_ICONS[iconKey || 'target'] || Target;
};
