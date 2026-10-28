import { useEffect, useRef, useState } from 'react';
import { aiApi } from '../api';

interface Props {
  title: string;
  description: string;
}

export function AiSolutionPanel({ title, description }: Props) {
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (description.trim().length < 12) {
      setSteps([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await aiApi.suggestSolution(title, description);
        setSteps(result.steps);
      } catch {
        setSteps([]);
      } finally {
        setLoading(false);
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, description]);

  if (description.trim().length < 12) return null;
  if (!loading && steps.length === 0) return null;

  return (
    <div className="ai-panel">
      <div className="ai-panel-head">
        <span className="ai-badge">💡 Talep açmadan önce dener misin?</span>
        {loading && <span className="text-muted-sm">öneriler hazırlanıyor...</span>}
      </div>

      {!loading && steps.length > 0 && (
        <ul className="ai-solution-list">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ul>
      )}

      {!loading && steps.length > 0 && (
        <p className="text-muted-sm" style={{ marginTop: 8, marginBottom: 0 }}>
          Bunlar sorunu çözmezse, aşağıdan talebini göndermeye devam edebilirsin.
        </p>
      )}
    </div>
  );
}
