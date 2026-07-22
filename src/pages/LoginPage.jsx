// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, useReducedMotion } from 'framer-motion';
import { HiOutlineUser, HiOutlineLockClosed } from 'react-icons/hi';

import { Card, Field, Input, Button } from '../components/ui';
import ThemeToggle from '../components/layout/ThemeToggle';
import { staggerContainer, staggerItem } from '../utils/motion';
import logoPolizando from '../assets/logos/polizando_logo.webp';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // Respeta "reducir movimiento" del sistema — sin animación de entrada si está activado.
  const reduceMotion = useReducedMotion();
  const entrance = reduceMotion ? {} : staggerContainer;
  const item = reduceMotion ? {} : staggerItem;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await login(username, password);
      if (!res || !res.success) {
        toast.error(res?.message || 'Acceso denegado. Verificá tus datos.');
      }
    } catch (error) {
      console.error('Error capturado en el login:', error);
      toast.error('Error de conexión. Revisá tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-200 dark:bg-brand-100 px-4">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* Fondo: dos formas suaves con los colores de marca, sin animación infinita */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] h-[500px] w-[500px] rounded-full bg-brand-primary/10 blur-[100px]" />
        <div className="absolute -bottom-[15%] -right-[10%] h-[450px] w-[450px] rounded-full bg-brand-secondary/10 blur-[100px]" />
      </div>

      <motion.form onSubmit={handleSubmit} {...entrance} className="relative z-10 w-full max-w-md">
        <Card padding="lg" className="shadow-xl">
          <motion.div {...item} className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10">
              <img
                src={logoPolizando}
                alt="Polizando"
                className="h-11 w-11 object-contain"
              />
            </div>

            <h1 className="font-heading text-3xl font-bold text-brand-100 dark:text-brand-200">
              Polizando
            </h1>
            <p className="mt-1 text-sm text-brand-100/60 dark:text-brand-200/60">
              Portal de gestión operativa
            </p>
          </motion.div>

          <div className="space-y-5">
            <motion.div {...item}>
              <Field label="Usuario" htmlFor="username">
                <div className="relative">
                  <HiOutlineUser className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-brand-100/40 dark:text-brand-200/40" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Tu usuario"
                    className="pl-10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </Field>
            </motion.div>

            <motion.div {...item}>
              <Field label="Contraseña" htmlFor="password">
                <div className="relative">
                  <HiOutlineLockClosed className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-brand-100/40 dark:text-brand-200/40" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </Field>
            </motion.div>

            <motion.div {...item} className="pt-2">
              <Button type="submit" loading={isLoading} size="lg" className="w-full">
                {isLoading ? 'Entrando...' : 'Iniciar sesión'}
              </Button>
            </motion.div>
          </div>

          <motion.p
            {...item}
            className="mt-8 text-center text-xs text-brand-100/40 dark:text-brand-200/40"
          >
            Acceso restringido a personal autorizado
          </motion.p>
        </Card>
      </motion.form>
    </div>
  );
};

export default LoginPage;