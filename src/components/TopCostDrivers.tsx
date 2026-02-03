"use client";

import { memo } from "react";
import { getProviderName, getProviderColor } from "@/lib/mockData";
import { clsx } from "clsx";

interface CostDriver {
  service: string;
  provider: "aws" | "gcp" | "azure";
  cost: number;
  percent: number;
}

interface TopCostDriversProps {
  drivers: CostDriver[];
}

export const TopCostDrivers = memo(function TopCostDrivers({ drivers }: TopCostDriversProps) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-lg font-semibold mb-6">Top Cost Drivers</h3>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Provider</th>
              <th className="text-right">Cost</th>
              <th className="text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver, index) => (
              <tr key={index} className="group">
                <td>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getProviderColor(driver.provider) }}
                    />
                    <span className="font-medium">{driver.service}</span>
                  </div>
                </td>
                <td>
                  <span
                    className={clsx(
                      "badge",
                      driver.provider === "aws" && "cloud-aws",
                      driver.provider === "gcp" && "cloud-gcp",
                      driver.provider === "azure" && "cloud-azure"
                    )}
                  >
                    {getProviderName(driver.provider)}
                  </span>
                </td>
                <td className="text-right font-semibold">
                  ${driver.cost.toLocaleString()}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${driver.percent}%`,
                          backgroundColor: getProviderColor(driver.provider),
                        }}
                      />
                    </div>
                    <span className="text-sm text-[var(--foreground-muted)] w-12 text-right">
                      {(driver.percent ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
