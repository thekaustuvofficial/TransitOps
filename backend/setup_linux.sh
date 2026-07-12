#!/bin/bash
# Hackathon Odoo 17 Native Linux Setup Script

echo "🚀 Starting Odoo 17 Native Installation..."

# 1. Update package list and install system dependencies
echo "📦 Installing system dependencies..."
sudo apt update
sudo apt install -y git wget curl nano libpq-dev libxml2-dev libxslt-dev \
libldap2-dev libsasl2-dev build-essential libssl-dev libffi-dev \
python3-pip python3-dev python3-venv libjpeg-dev zlib1g-dev \
liblcms2-dev libblas-dev libatlas-base-dev nodejs npm

# 2. Install PostgreSQL Database
echo "🗄️ Installing PostgreSQL..."
sudo apt-get install -y postgresql

# Create Postgres User for Odoo
sudo su - postgres -c "createuser -s $USER" 2>/dev/null || true

# 3. Clone Odoo 17 
echo "📥 Cloning Odoo 17 Framework..."
git clone https://github.com/odoo/odoo --depth 1 --branch 17.0 --single-branch odoo_framework

# 4. Setup Python Virtual Environment
echo "🐍 Setting up Python Virtual Environment..."
python3 -m venv odoo-venv
source odoo-venv/bin/activate

# 5. Install Python dependencies
echo "⚙️ Installing Python requirements..."
pip install --upgrade pip
pip install wheel
pip install -r odoo_framework/requirements.txt

echo "✅ Setup Complete! Run the server with: source odoo-venv/bin/activate && python3 odoo_framework/odoo-bin -c odoo.conf"