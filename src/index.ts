import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

console.log('LabHub WS');
console.log(chalk.green(PORT));
console.log(chalk.red(isProd));
