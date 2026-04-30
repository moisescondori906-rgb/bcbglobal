import bcrypt from 'bcryptjs';
const hash = '$2a$10$52UiSMTdr2IsbZBxxzTXOu0tUnthmXBY7JhEzpXGWJzxX9CnEwIRW';
bcrypt.compare('14738941lp', hash).then(res => console.log('Match result:', res));
