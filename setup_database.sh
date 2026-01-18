#!/bin/bash

# MySQL Database Setup Script for Telecom Network Management
# This script creates the database and user needed for the application

echo "🔧 Setting up MySQL database for Telecom Network Management..."
echo ""
echo "This will:"
echo "  1. Create database: telecom_network_db"
echo "  2. Create user: telecom_user"
echo "  3. Set password: assembly1234"
echo "  4. Grant necessary permissions"
echo ""

# Execute MySQL commands
sudo mysql -u root <<EOF
-- Create the database
CREATE DATABASE IF NOT EXISTS telecom_network_db;

-- Create a new user with password
CREATE USER IF NOT EXISTS 'telecom_user'@'localhost' IDENTIFIED BY 'assembly1234';

-- Grant all privileges on the database to this user
GRANT ALL PRIVILEGES ON telecom_network_db.* TO 'telecom_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Show confirmation
SELECT 'Database and user created successfully!' AS status;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ MySQL setup completed successfully!"
    echo ""
    echo "You can now run: cd server && node database.js"
else
    echo ""
    echo "❌ MySQL setup failed. Please check the error messages above."
    exit 1
fi
