require('dotenv').config(); 
const jwtSecret = process.env.JWT_SECRET;

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const PAGE_SIZE = 10; // Tamaño de la página
const app = express();


app.use(cors());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
  next();
});

app.use(express.json()); // Para parsear JSON en las solicitudes entrantes

// Conexión a MongoDB
mongoose.connect('mongodb+srv://admin:QlPRKHR8t2YUMgwS@atlascluster.soia7fc.mongodb.net/241-sis8?retryWrites=true&w=majority&appName=AtlasCluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB...'))
.catch(err => console.error('No se pudo conectar a MongoDB...', err));

// Definir un esquema y modelo de Mongoose para una entidad, por ejemplo, 'Usuario'
const usuarioSchema = new mongoose.Schema({
  nombre: String,
  edad: Number,
  passwd: String,
  avatar: Buffer,
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
      return res.status(403).json({ mensaje: 'Token no proporcionado' });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
          return res.status(401).json({ mensaje: 'Token inválido' });
      }
      req.user = decoded; // Guarda los datos del usuario decodificados en el objeto de solicitud
      next();
  });
}

// Rutas HTTP
app.get('/', (req, res) => {
  res.send('Hola Mundo A todos!');
});

/* // Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.send(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
}); */

app.post('/api/validar-token', verifyToken, (req, res) => {

  res.json({ user: req.user });

});

app.get('/api/usuarios', verifyToken, async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1; // Página actual
    let perpage = parseInt(req.query.limit) || 10; // Página actual
    const skip = (page - 1) * perpage; // Saltar los documentos ya mostrados en páginas anteriores

    const [usuarios, totalCount] = await Promise.all([
      Usuario.find().skip(skip).limit(perpage), // Obtener usuarios para la página actual
      Usuario.countDocuments() // Obtener el número total de usuarios
    ]);

    res.set('X-Total-Count', totalCount); // Configurar el encabezado X-Total-Count en la respuesta
    res.json(usuarios);
    //console.log(totalCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
});

app.post('/api/registrar-usuario', async (req, res) => {
  try {
    // Validar datos de entrada
    const { nombre, edad, passwd, avatar } = req.body;
    if (!nombre || !edad || !passwd) {
      return res.status(400).json({ mensaje: "Por favor, proporcione nombre, edad y contraseña" });
    }
    const user = await Usuario.findOne({ nombre });
    if (user) {
      return res.status(401).json({ mensaje: "El usuario ya existe" });
    }
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(passwd, 10);

    // Crear nuevo usuario con contraseña hasheada
    const usuario = new Usuario({
      nombre,
      edad,
      passwd: hashedPassword,
      avatar
    });

    const token = jwt.sign({ nombre: usuario.nombre}, jwtSecret, { expiresIn: '1h' });

    // Guardar usuario en la base de datos
    await usuario.save();
    res.json({token, usuario});
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
});

app.post('/api/agregar-usuario', verifyToken, async (req, res) => {
  try {
    // Validar datos de entrada
    const { nombre, edad, passwd, avatar } = req.body;
    if (!nombre || !edad || !passwd) {
      return res.status(400).json({ mensaje: "Por favor, proporcione nombre, edad y contraseña" });
    }
    const user = await Usuario.findOne({ nombre });
    if (user) {
      return res.status(401).json({ mensaje: "El usuario ya existe" });
    }
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(passwd, 10);

    // Crear nuevo usuario con contraseña hasheada
    const usuario = new Usuario({
      nombre,
      edad,
      passwd: hashedPassword,
      avatar
    });

    // Guardar usuario en la base de datos
    await usuario.save();
    res.json({usuario});
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
});

app.put('/api/agregar-usuario', verifyToken, async (req, res) => {
  try {
    // Extraer el ID del usuario del cuerpo de la solicitud
    const userId = req.body.userId;

    // Verificar si se proporcionó un ID de usuario válido
    if (!userId) {
      return res.status(400).json({ mensaje: "Debe proporcionar un ID de usuario en el cuerpo de la solicitud" });
    }

    // Buscar el usuario en la base de datos por su ID
    const usuario = await Usuario.findById(userId);

    // Verificar si el usuario existe
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // Actualizar los datos del usuario con los proporcionados en el cuerpo de la solicitud
    usuario.nombre = req.body.nombre || usuario.nombre;
    usuario.edad = req.body.edad || usuario.edad;
    usuario.passwd = req.body.passwd || usuario.passwd;

    // Guardar los cambios en la base de datos
    await usuario.save();

    // Enviar una respuesta de éxito con el usuario actualizado
    res.json({ mensaje: "Usuario actualizado exitosamente", usuario });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor al actualizar el usuario" });
  }
});


app.delete('/api/usuario', verifyToken, async (req, res)=>{
  try {
    const id_user = req.body.userId;
    if(!id_user){
      return res.status(400).json({mensaje:"Debe proporcionar el ID de usuario en el cuerpo de la solicitud"});
    }
    const UsuarioEliminado = await Usuario.findOneAndDelete({_id: id_user});

    if(!UsuarioEliminado){
      return res.status(404).json({ mensaje: "Usuario no encontrado"});
    }

    res.json({mensaje: "Usuario eliminado"});
  } catch (error) {
    console.error(error);
    res.status(500).json({mensaje: "Error del servidor"});
  }
  
});

app.delete('/api/usuarios', verifyToken, async (req, res)=>{
  const idsToDelete = req.body.ids;
  if (!idsToDelete || !Array.isArray(idsToDelete)) {
    return res.status(400).json({ mensaje: "Por favor, proporcione una matriz de IDs de usuario para eliminar" });
  }
  try {
    const result = await Usuario.deleteMany({ _id: { $in: idsToDelete } });
    res.json({ message: `${result.deletedCount} usuarios eliminados correctamente` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor al eliminar usuarios" });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { nombre, passwd } = req.body;
    const usuario = await Usuario.findOne({ nombre });
    if (!usuario) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }
    const match = await bcrypt.compare(passwd, usuario.passwd);
    if (!match) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }
    const token = jwt.sign({ nombre: usuario.nombre}, jwtSecret, { expiresIn: '1h' });
    res.json({ token, usuario });
    //res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error del servidor al iniciar sesión" });
  }
});

// Establecer el puerto y escuchar las solicitudes
const port = process.env.PORT || 5080;
app.listen(port, () => console.log(`Escuchando en el puerto ${port}...`));
