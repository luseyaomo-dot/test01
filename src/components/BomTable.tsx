import { Download, Filter } from 'lucide-react';
import type { BomRow } from '../modeling/bom';
import { summariseBom } from '../modeling/bom';

type BomTableProps = {
  rows: BomRow[];
  hints?: string[];
};

const formatNumber = (value: number, digits = 2) =>
  value.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function BomTable({ rows, hints = [] }: BomTableProps) {
  const summary = summariseBom(rows);

  return (
    <section className="bom-panel">
      <div className="bom-table-wrapper">
        <header className="bom-header">
          <div>
            <h3>钢筋下料单</h3>
            <span>合计 {formatNumber(summary.totalWeight)} kg · {summary.types} 类</span>
          </div>
          <div className="bom-actions">
            <button type="button" className="ghost-action"><Filter size={14} /> 筛选</button>
            <button type="button" className="ghost-action"><Download size={14} /> 导出 CSV</button>
          </div>
        </header>
        <div className="bom-table-scroll">
          <table className="bom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>类型</th>
                <th className="num">直径 (MM)</th>
                <th className="num">根数</th>
                <th className="num">单长 (M)</th>
                <th className="num">总长 (M)</th>
                <th className="num">重量 (KG)</th>
                <th>备注</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="row-id">{row.id}</td>
                  <td>{row.type}</td>
                  <td className="num">{row.diameter}</td>
                  <td className="num">{row.count}</td>
                  <td className="num">{formatNumber(row.singleLength)}</td>
                  <td className="num">{formatNumber(row.totalLength)}</td>
                  <td className="num">{formatNumber(row.weight)}</td>
                  <td>{row.note ?? (row.type.includes('箍') ? '弯钩' : '通长')}</td>
                  <td>
                    <span className={`status-pill ${row.status}`}>{row.status === 'ok' ? '合规' : row.status === 'warn' ? '注意' : '提示'}</span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-row">当前模型无钢筋数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="bom-hint">
        <h4>智能提示</h4>
        <ul>
          {hints.length === 0 && <li>所有钢筋已按 22G101 默认构造生成。</li>}
          {hints.map((hint, index) => (
            <li key={index}>{hint}</li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
