import axios from "axios";
export const key = process.env.STRIPE || "";

export interface IRate {
  Pounds: number;
  EUR: number;
  USD: number;
}
export const handleRateChange = async (): Promise<IRate> => {
  const pounds: number = await calculateRate("gbp");
  const euro: number = await calculateRate("eur");

  return {
    Pounds: pounds,
    EUR: euro,
    USD: 1,
  };
};

export const calculateRate = async (label: string): Promise<number> => {
  const response = await axios.get(
    `https://api.striperates.com/rates/${label}`,
    {
      headers: {
        "x-api-key": key,
      },
    }
  );

  const usd: number = response.data.data[0].rates.usd;
  return Number(usd.toFixed(2));
};
