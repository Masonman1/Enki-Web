// lib/phase-hook.ts (replace handleUpload; ensure import { v4 as uuidv4 } from 'uuid'; at top)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleUpload = async (acceptedFiles: File[]) => {
  if (!session?.user?.id) {
    setError('Authentication required');
    toast.error('Please sign in');
    return;
  }

  setUploading(true);
  setError(null);
  setRisks([]);
  setGeneratedItems([]);

  try {
    const fileUrls: string[] = [];

    for (const file of acceptedFiles) {
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, ''); // Clean for safety
      const filePath = `phase/user_${session.user.id}/${uuidv4()}/${safeName}`; // Prefix to match policies
      const { error: uploadError } = await supabase.storage
        .from('enki-storage')
        .upload(filePath, file, { upsert: true }); // Upsert to avoid duplicate 400s

      if (uploadError) {
        console.error('Upload error details:', uploadError.name, uploadError.message, uploadError.statusCode); // Detailed log
        throw uploadError;
      }

      const { data: signedData, error: signError } = await supabase.storage
        .from('enki-storage')
        .createSignedUrl(filePath, 3600);

      if (signError) {
        console.error('Signed URL error:', signError);
        throw signError;
      }
      if (!signedData?.signedUrl) throw new Error('Failed to generate signed URL');
      fileUrls.push(signedData.signedUrl);
    }

    const parsedResults = await parseFiles(fileUrls, { focus });
    console.log('Debug: parsedResults from parseFiles:', parsedResults); // For verification

    const allRisks = parsedResults.flatMap(r => r.risks || []);
    setRisks(allRisks);

    // Populate dynamic essentials (priority for phase1a)
    if (extraParsedFields && parsedResults.length > 0) {
      const essentials: Record<string, unknown> = {};
      extraParsedFields.forEach(field => {
        essentials[field] = parsedResults[0][field as keyof typeof parsedResults[0]] ?? null;
      });
      setParsedEssentials(essentials);
    }

    let generated: string[];
    if (onGenerateCustom) {
      generated = await onGenerateCustom(allRisks);
    } else {
      generated = await generateFromRisks(allRisks, {
        type: generateType,
        context,
      });
    }

    setGeneratedItems(generated);
    toast.success('Processing complete!');

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error('Full upload/parse error:', err); // Catch-all debug
    setError(message);
    toast.error(message);
  } finally {
    setUploading(false);
  }
};