import type { GetServerSideProps } from 'next';
import { Header, Footer, Button } from '@miro/shared-ui';
import { MicroLink } from '@miro/micro-core';
import { useEmitEvent, useEventBus, withSharedStateServerSideProps } from '@miro/shared-state';
import { useState } from 'react';

interface Activity {
  id: number;
  title: string;
  status: 'active' | 'ended';
}

interface ActivityListProps {
  activities: Activity[];
}

export const getServerSideProps: GetServerSideProps<ActivityListProps> = withSharedStateServerSideProps(
  async (ctx) => {
    const activities: Activity[] = [
      { id: 1, title: '新用户注册奖励', status: 'active' },
      { id: 2, title: '春节限时活动', status: 'ended' },
      { id: 3, title: '邀请好友返利', status: 'active' },
    ];

    return {
      props: {
        activities,
      },
    };
  }
);

export default function ActivityListPage({ activities }: ActivityListProps) {
  const emitEvent = useEmitEvent();
  const [lastEvent, setLastEvent] = useState<string>('');
  const [eventCount, setEventCount] = useState(0);

  useEventBus('activity:clicked', (payload) => {
    setLastEvent(`收到事件: 点击了活动 #${payload.id}`);
    setEventCount((count) => count + 1);
  });

  const handleActivityClick = (activity: Activity) => {
    emitEvent('activity:clicked', { id: activity.id, title: activity.title });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header currentApp="activity" />

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>活动列表</h1>
          <MicroLink href="/activity">
            <Button variant="ghost" size="sm">返回</Button>
          </MicroLink>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {activities.map((activity) => (
            <div
              key={activity.id}
              style={{
                padding: '16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                  {activity.title}
                </h3>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: activity.status === 'active' ? '#dcfce7' : '#f1f5f9',
                    color: activity.status === 'active' ? '#16a34a' : '#94a3b8',
                  }}
                >
                  {activity.status === 'active' ? '进行中' : '已结束'}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleActivityClick(activity)}
              >
                查看详情
              </Button>
            </div>
          ))}
        </div>

        {lastEvent && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#2563eb',
          }}>
            EventBus 事件: {lastEvent} | 当前 tab 触发次数: {eventCount}
          </div>
        )}

        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '16px' }}>
          此页面从 /activity 首页通过 SPA 方式跳转而来（无 full reload）。
          点击"查看详情"会通过 EventBus 发射事件，同 tab 只应增加 1 次计数。
        </p>
      </main>

      <Footer />
    </div>
  );
}
