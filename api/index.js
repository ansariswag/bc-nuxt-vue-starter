import express from 'express';
import bodyParser from 'body-parser';
import product from './routes/product';
import address from './routes/address';
import order from './routes/order';
import cart from './routes/cart';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(product);
app.use(address);
app.use(order);
app.use(cart);

if (require.main === module) {
  const port = 3001;
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

export default app;