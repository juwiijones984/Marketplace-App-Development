# Marketplace App Development

A modern, full-stack marketplace application built with React, TypeScript, and Supabase. This platform enables users to buy and sell products with features like user authentication, listing management, order processing, and admin dashboard.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure signup and login with Supabase Auth
- **Product Listings**: Create, view, and manage marketplace listings
- **Order Management**: Complete order lifecycle from purchase to delivery
- **Admin Dashboard**: Administrative controls for platform management
- **Responsive Design**: Mobile-first design with Tailwind CSS

### Advanced Features
- **Image Upload**: Direct file selection from device or camera capture
- **Location Services**: GPS-based location detection for listings
- **Real-time Notifications**: Toast notifications for user feedback
- **Category Management**: Organized product categorization
- **Review System**: Buyer-seller rating and review system
- **Verification System**: Item and user verification workflows

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library

### Backend & Database
- **Supabase** - Backend-as-a-Service (Auth, Database, Storage, Functions)
- **Hono** - Lightweight web framework for edge functions
- **KV Store** - Custom key-value storage for listings and metadata

### Development Tools
- **ESLint** - Code linting
- **SWC** - Fast TypeScript/JavaScript compiler
- **Vite Plugin React SWC** - Optimized React compilation

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/juwiijones984/Marketplace-App-Development.git
   cd Marketplace-App-Development
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Update the Supabase configuration in `src/utils/supabase/info.tsx`

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components (Radix UI based)
│   ├── AdminDashboard.tsx
│   ├── AuthPage.tsx
│   ├── BuyerOrders.tsx
│   ├── CreateListing.tsx
│   ├── HomePage.tsx
│   ├── ListingDetailPage.tsx
│   ├── LogoHeader.tsx
│   └── SellerDashboard.tsx
├── supabase/            # Backend functions and utilities
│   └── functions/
│       └── server/      # Hono-based edge functions
├── utils/               # Utility functions
│   └── supabase/        # Supabase client and configuration
├── assets/              # Static assets
├── styles/              # Global styles
└── guidelines/          # Project guidelines and documentation
```

## 🎯 Key Components

### CreateListing Component
- **Image Upload**: Supports both file selection and camera capture
- **Location Detection**: Automatic GPS location or manual input
- **Form Validation**: Comprehensive validation with error handling
- **Real-time Upload**: Images uploaded to Supabase Storage immediately

### Authentication Flow
- **Secure Auth**: Supabase Auth integration
- **Role-based Access**: Buyer, Seller, and Admin roles
- **Protected Routes**: Route protection based on authentication status

### Dashboard Features
- **Seller Dashboard**: Manage listings and view sales
- **Buyer Orders**: Track purchases and order history
- **Admin Panel**: Platform-wide management and analytics

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Enable Authentication, Database, and Storage
3. Create storage bucket named 'listings' for image uploads
4. Configure Row Level Security (RLS) policies
5. Set up edge functions for server-side logic

### Environment Variables
Update `src/utils/supabase/info.tsx` with your Supabase credentials:

```typescript
export const projectId = 'your-project-id';
export const publicAnonKey = 'your-anon-key';
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Other Platforms
- **Netlify**: Static site deployment
- **Railway**: Full-stack deployment with database
- **Supabase**: Direct deployment with edge functions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Guidelines

- Follow TypeScript best practices
- Use functional components with hooks
- Maintain consistent code formatting
- Write descriptive commit messages
- Test components thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original design from [Figma Marketplace App Design](https://www.figma.com/design/uYM11KEk1QFzb5v7h6dxmN/Marketplace-App-Development)
- Built with modern web technologies and best practices
- Community contributions and feedback welcome

## 📞 Support

For questions or support, please open an issue on GitHub or contact the maintainers.

---

**Happy coding! 🎉**
