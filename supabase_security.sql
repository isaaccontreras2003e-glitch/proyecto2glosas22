-- COPIA ÚNICAMENTE ESTE BLOQUE DE CÓDIGO --

-- 1. Activar RLS en las tablas principales
ALTER TABLE glosas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 2. Crear Políticas para 'glosas'
CREATE POLICY "Admins full access glosas" ON glosas 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Visors read only glosas" ON glosas 
FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'visor'));

-- 3. Crear Políticas para 'ingresos'
CREATE POLICY "Admins full access ingresos" ON ingresos 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Visors read only ingresos" ON ingresos 
FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'visor'));

-- 4. Crear Políticas para 'perfiles' (Permitir que el usuario vea su propio rol)
CREATE POLICY "Users can view own profile" ON perfiles 
FOR SELECT TO authenticated 
USING (auth.uid() = id);
