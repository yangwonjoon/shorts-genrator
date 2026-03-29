'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { HistoryList } from '@/components/history-list';
import type { GenerationRecord } from '@/types';

export default function HistoryPage() {
  const [items, setItems] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/generate')
      .then((res) => res.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="📋 생성 이력" />
      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-20 text-zinc-500">불러오는 중...</div>
        ) : (
          <HistoryList items={items} />
        )}
      </div>
    </div>
  );
}
