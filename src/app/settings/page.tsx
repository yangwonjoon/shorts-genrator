'use client';

import { Header } from '@/components/header';

const API_KEYS = [
  {
    id: 'openai',
    label: 'OpenAI API Key',
    env: 'OPENAI_API_KEY',
    description: 'OpenAI/Codex 계열 모델로 스크립트를 생성할 때 필요합니다',
    link: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    label: 'Anthropic API Key',
    env: 'ANTHROPIC_API_KEY',
    description: 'Claude AI를 사용한 스크립트 생성에 필요합니다',
    link: 'https://console.anthropic.com/',
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs API Key',
    env: 'ELEVENLABS_API_KEY',
    description: 'TTS 음성 생성에 필요합니다',
    link: 'https://elevenlabs.io/',
  },
  {
    id: 'elevenlabs-voice',
    label: 'ElevenLabs Voice ID',
    env: 'ELEVENLABS_VOICE_ID',
    description: '무료 플랜에서는 Default voice의 Voice ID를 넣어 사용하는 것을 권장합니다',
    link: 'https://elevenlabs.io/app/voice-library',
  },
  {
    id: 'pexels',
    label: 'Pexels API Key',
    env: 'PEXELS_API_KEY',
    description: '배경 영상 검색 및 다운로드에 필요합니다',
    link: 'https://www.pexels.com/api/',
  },
];

export default function SettingsPage() {
  return (
    <div className="flex-1 flex flex-col">
      <Header title="⚙️ 설정" />
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">API 키 설정</h3>
            <p className="text-sm text-zinc-400 mb-6">
              API 키는 <code className="text-violet-400">.env.local</code> 파일에서
              관리됩니다. 서버를 재시작해야 적용됩니다.
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              AI 제공자를 바꾸려면 <code className="text-violet-400">AI_PROVIDER</code>
              를 <code className="text-violet-400">claude</code> 또는{' '}
              <code className="text-violet-400">openai</code>로 설정하세요.
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              ElevenLabs 무료 플랜에서 API를 테스트할 때는{' '}
              <code className="text-violet-400">ELEVENLABS_VOICE_ID</code>에
              Default voice의 ID를 넣어주세요.
            </p>
          </div>

          {API_KEYS.map((key) => (
            <div
              key={key.id}
              className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">{key.label}</h4>
                <a
                  href={key.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  키 발급받기 →
                </a>
              </div>
              <p className="text-sm text-zinc-400 mb-3">{key.description}</p>
              <code className="text-xs bg-zinc-900 text-zinc-300 px-3 py-1.5 rounded block">
                {key.env}=your_api_key_here
              </code>
            </div>
          ))}

          <div className="p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl">
            <h4 className="font-medium text-white mb-2">FFmpeg</h4>
            <p className="text-sm text-zinc-400 mb-3">
              영상 합성을 위해 FFmpeg가 시스템에 설치되어 있어야 합니다.
            </p>
            <code className="text-xs bg-zinc-900 text-zinc-300 px-3 py-1.5 rounded block">
              brew install ffmpeg
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
