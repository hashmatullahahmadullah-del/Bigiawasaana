import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/admin')
    })
    return () => unsub()
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/admin')
    } catch (err) {
      toast.error('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="text-center pb-6">
          <img src="/logo.png" alt="Logo" className="h-16 mx-auto mb-4" />
          <CardTitle className="font-barlow text-2xl tracking-widest uppercase">Commander Login</CardTitle>
          <CardDescription>Authorized personnel only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="commander@bigiawasaana.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full font-barlow tracking-widest uppercase mt-4">
              Access Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
