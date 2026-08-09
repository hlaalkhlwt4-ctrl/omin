export type OrderLineInput = { price: number; quantity: number };

export function calculateOrderTotal(items: OrderLineInput[]) {
  return roundMoney(items.reduce((total, item) => total + item.price * item.quantity, 0));
}

export function sumMoney(items: Array<{ amount: number }>) {
  return roundMoney(items.reduce((total, item) => total + item.amount, 0));
}

export function calculateNetCashflow(payments: Array<{ amount: number }>, expenses: Array<{ amount: number }>) {
  const collected = sumMoney(payments);
  const spent = sumMoney(expenses);
  return { collected, spent, net: roundMoney(collected - spent) };
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
