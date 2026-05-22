// @ts-nocheck
import { TransferTicketsPanel } from './TransferTicketsPanel';

export function TransferView() {
  return (
    <div className="container mx-auto py-6 max-w-4xl h-full">
      <div className="flex flex-col h-full gap-6">
        <div className="flex-1 min-h-0">
          <TransferTicketsPanel />
        </div>
      </div>
    </div>
  );
}
