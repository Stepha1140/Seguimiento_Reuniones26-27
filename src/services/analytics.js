export const MAX_COST_PER_PARTICIPANT=60000;
export function financialMetrics(expenses,unique,repeated){const total=unique+repeated,cost=total?expenses/total:0;return{expenses,unique,repeated,total,cost,uniqueSpend:total?expenses*unique/total:0,repeatedSpend:total?expenses*repeated/total:0,overLimit:cost>MAX_COST_PER_PARTICIPANT}}
export function goalProgress(current,target){return{current,target,missing:Math.max(target-current,0),percentage:target?Math.min(current/target*100,100):0}}
export function dataQuality(rows,rules){const checks=rules.map(r=>({name:r.name,missing:rows.filter(x=>!r.valid(x)).length}));const errors=checks.reduce((a,x)=>a+x.missing,0),possible=rows.length*rules.length;return{score:possible?Math.round((possible-errors)/possible*100):100,checks}}

