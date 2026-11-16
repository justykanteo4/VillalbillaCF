function saleValueCents(marketCents){if(!Number.isSafeInteger(marketCents)||marketCents<=0)throw Error('Valor de mercado no válido');return Math.round(marketCents*40/100)}
module.exports={saleValueCents};
