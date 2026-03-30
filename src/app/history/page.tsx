'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { HistoryList } from '@/components/history-list';
import type { GenerationRecord } from '@/types';

export default function HistoryPage() {
  const [items, setItems] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/generate', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    const confirmed = window.confirm('이 생성 이력을 삭제할까요?');
    if (!confirmed) return;

    const res = await fetch(`/api/generate?id=${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      window.alert('삭제에 실패했습니다');
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleBulkDelete(ids: string[]) {
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `선택한 ${ids.length}개의 생성 이력을 삭제할까요?`
    );
    if (!confirmed) return;

    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/generate?id=${id}`, {
          method: 'DELETE',
        })
      )
    );

    if (results.some((res) => !res.ok)) {
      window.alert('일부 항목 삭제에 실패했습니다');
      return;
    }

    setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="📋 생성 이력" />
      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-20 text-zinc-500">불러오는 중...</div>
        ) : (
          <HistoryList
            items={items}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
          />
        )}
      </div>
    </div>
  );
}
