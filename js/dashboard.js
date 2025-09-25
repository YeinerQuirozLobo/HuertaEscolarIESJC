// Subir imagen al bucket "productos"
const fileName = `${Date.now()}-${user.id}-${imagenFile.name}`;
const { data: imgData, error: imgError } = await supabase.storage
    .from("productos")
    .upload(fileName, imagenFile);

if (imgError) throw imgError;

// Obtener la URL pública de la imagen
const { data: urlData } = supabase.storage
    .from("productos")
    .getPublicUrl(imgData.path);

const imagen_url = urlData.publicUrl; // ✅ Ahora sí tienes la URL

// Insertar la publicación en la tabla "publicaciones"
const { error } = await supabase
  .from("publicaciones")
  .insert([
    {
      user_id: user.id,   // ⚡ ID correcto
      producto,
      cantidad,
      unidad,
      imagen_url,         // ✅ Ahora definida
      producto_deseado: productoDeseado,
      cantidad_deseada: cantidadDeseada,
      unidad_deseada: unidadDeseada
    }
  ]);

if (error) {
  console.error("❌ Error al publicar:", error.message);
  alert("❌ No se pudo publicar el producto.");
} else {
  console.log("✅ Publicación insertada con éxito");
  alert("✅ Publicación realizada con éxito");
  formPublicacion.reset();
  await cargarPublicaciones();
}
