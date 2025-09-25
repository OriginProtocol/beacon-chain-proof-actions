import Image from "next/image";
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export default function Home() {
  return (
    <main style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Welcome to My Next.js App with MUI
      </Typography>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h5">This is a Card</Typography>
          <Button variant="contained" color="primary">
            Click Me
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
