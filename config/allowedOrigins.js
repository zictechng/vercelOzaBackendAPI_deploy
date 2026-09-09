const allowedOrigins = [
    // Local development
    'http://localhost:2400',
    'http://localhost:3000',
    'http://localhost:3000/user',
    'http://localhost:3001',
    'http://localhost:3002',  // Admin portal
    'http://localhost:3003',
    'http://localhost:3500',
    'http://localhost:4200',
    'http://localhost',

    // Local network IPs
    'http://192.168.1.73:3000',
    'http://192.168.1.73:3001',
    'http://192.168.1.73:3002',
    'http://192.168.1.73:3003',
    'http://192.168.1.73:3500',
    'http://192.168.1.169:3500',
    'http://192.168.1.83:3500',
    'http://192.168.0.239:3000',
    'http://192.168.0.239:3002',
    'http://192.168.0.239:3500',

    // Production
    'https://ozaapp.com',
    'https://www.ozaapp.com',
    'https://admin.ozaapp.com',
    'https://adminoffice.ozaapp.com',
    'https://ozabackendapi.ozaapp.com',
    'https://ozawebservice.onrender.com',
    'http://www.zictech-ng.com',
    'https://www.zictech-ng.com',
]

module.exports = allowedOrigins;